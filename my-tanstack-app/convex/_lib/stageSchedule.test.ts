/**
 * Stage dates and the dependency cascade. Shifting one stage's end date moves
 * every following stage that declares dependsOnPrevious, which means a bug here
 * silently rewrites a whole project timeline.
 */
import { convexTest } from 'convex-test';
import { describe, test, expect } from 'vitest';
import schema from '../schema';
import { assertStageDateRange, patchStageDatesWithCascade } from './stageSchedule';
import { seedProject, makeStage } from '../_test/factories';

const modules = import.meta.glob('../**/*.ts');

describe('assertStageDateRange', () => {
  test('accepts a normal range', () => {
    expect(() => assertStageDateRange('2026-01-01', '2026-01-31')).not.toThrow();
  });

  test('accepts a single-day stage (end === start)', () => {
    // The check is `end < start`, so equal dates are valid.
    expect(() => assertStageDateRange('2026-03-04', '2026-03-04')).not.toThrow();
  });

  test('rejects an end date before the start date', () => {
    expect(() => assertStageDateRange('2026-02-01', '2026-01-31')).toThrow(
      /end date cannot be before start date/,
    );
  });

  test('rejects by one day', () => {
    expect(() => assertStageDateRange('2026-01-02', '2026-01-01')).toThrow();
  });

  test('rejects unparseable dates', () => {
    expect(() => assertStageDateRange('not-a-date', '2026-01-01')).toThrow(/Invalid stage dates/);
    expect(() => assertStageDateRange('2026-01-01', '')).toThrow(/Invalid stage dates/);
  });

  test('ignores any time component, comparing dates only', () => {
    // dateOnly() slices to 10 chars, so a timestamp later in the day on the
    // start date does not make the range invalid.
    expect(() => assertStageDateRange('2026-01-01T23:00:00Z', '2026-01-01T01:00:00Z')).not.toThrow();
  });

  test('handles month and year boundaries', () => {
    expect(() => assertStageDateRange('2026-12-31', '2027-01-01')).not.toThrow();
    expect(() => assertStageDateRange('2027-01-01', '2026-12-31')).toThrow();
    // 2028 is a leap year.
    expect(() => assertStageDateRange('2028-02-28', '2028-02-29')).not.toThrow();
  });
});

describe('patchStageDatesWithCascade', () => {
  /** Three consecutive stages; `dependsOnPrevious` is set per stage. */
  const threeStages = async (t: ReturnType<typeof convexTest>, depends: boolean[]) => {
    const { projectId } = await seedProject(t);
    const ids = await t.run(async (ctx) => [
      await ctx.db.insert('stages', makeStage(projectId, {
        name: 'א', sortOrder: 0, startDate: '2026-01-01', endDate: '2026-01-10',
        dependsOnPrevious: depends[0],
      })),
      await ctx.db.insert('stages', makeStage(projectId, {
        name: 'ב', sortOrder: 1, startDate: '2026-01-11', endDate: '2026-01-20',
        dependsOnPrevious: depends[1],
      })),
      await ctx.db.insert('stages', makeStage(projectId, {
        name: 'ג', sortOrder: 2, startDate: '2026-01-21', endDate: '2026-01-30',
        dependsOnPrevious: depends[2],
      })),
    ]);
    return { projectId, ids };
  };

  const datesOf = (t: ReturnType<typeof convexTest>, id: any) =>
    t.run(async (ctx) => {
      const s = await ctx.db.get(id);
      return { startDate: s!.startDate, endDate: s!.endDate };
    });

  test('patches the edited stage and reports it', async () => {
    const t = convexTest(schema, modules);
    const { projectId, ids } = await threeStages(t, [false, false, false]);

    const shifted = await t.run(async (ctx) => {
      const stage = (await ctx.db.get(ids[0]))!;
      return patchStageDatesWithCascade(ctx, {
        projectId, stage, startDate: '2026-01-02', endDate: '2026-01-12',
      });
    });

    expect(await datesOf(t, ids[0])).toEqual({ startDate: '2026-01-02', endDate: '2026-01-12' });
    expect(shifted[0]).toMatchObject({ startDate: '2026-01-02', endDate: '2026-01-12' });
  });

  test('cascades the END delta to following dependent stages', async () => {
    const t = convexTest(schema, modules);
    const { projectId, ids } = await threeStages(t, [false, true, true]);

    // End moves 2026-01-10 -> 2026-01-15, a +5 day delta.
    const shifted = await t.run(async (ctx) => {
      const stage = (await ctx.db.get(ids[0]))!;
      return patchStageDatesWithCascade(ctx, {
        projectId, stage, startDate: '2026-01-01', endDate: '2026-01-15',
      });
    });

    expect(shifted).toHaveLength(3);
    expect(await datesOf(t, ids[1])).toEqual({ startDate: '2026-01-16', endDate: '2026-01-25' });
    expect(await datesOf(t, ids[2])).toEqual({ startDate: '2026-01-26', endDate: '2026-02-04' });
  });

  test('cascades backwards for a negative delta', async () => {
    const t = convexTest(schema, modules);
    const { projectId, ids } = await threeStages(t, [false, true, true]);

    await t.run(async (ctx) => {
      const stage = (await ctx.db.get(ids[0]))!;
      return patchStageDatesWithCascade(ctx, {
        projectId, stage, startDate: '2026-01-01', endDate: '2026-01-07',
      });
    });

    // -3 days.
    expect(await datesOf(t, ids[1])).toEqual({ startDate: '2026-01-08', endDate: '2026-01-17' });
  });

  test('stops at the first stage that does NOT depend on the previous one', async () => {
    const t = convexTest(schema, modules);
    const { projectId, ids } = await threeStages(t, [false, false, true]);

    const shifted = await t.run(async (ctx) => {
      const stage = (await ctx.db.get(ids[0]))!;
      return patchStageDatesWithCascade(ctx, {
        projectId, stage, startDate: '2026-01-01', endDate: '2026-01-15',
      });
    });

    // Stage ב breaks the chain, so ג must not move even though it depends on
    // its own predecessor. `break`, not `continue` — pinned deliberately.
    expect(shifted).toHaveLength(1);
    expect(await datesOf(t, ids[1])).toEqual({ startDate: '2026-01-11', endDate: '2026-01-20' });
    expect(await datesOf(t, ids[2])).toEqual({ startDate: '2026-01-21', endDate: '2026-01-30' });
  });

  test('an unchanged end date cascades nothing, even if the start moved', async () => {
    const t = convexTest(schema, modules);
    const { projectId, ids } = await threeStages(t, [false, true, true]);

    const shifted = await t.run(async (ctx) => {
      const stage = (await ctx.db.get(ids[0]))!;
      return patchStageDatesWithCascade(ctx, {
        projectId, stage, startDate: '2026-01-05', endDate: '2026-01-10',
      });
    });

    expect(shifted).toHaveLength(1);
    expect(await datesOf(t, ids[0])).toEqual({ startDate: '2026-01-05', endDate: '2026-01-10' });
    expect(await datesOf(t, ids[1])).toEqual({ startDate: '2026-01-11', endDate: '2026-01-20' });
  });

  test('applies an extra patch alongside the dates', async () => {
    const t = convexTest(schema, modules);
    const { projectId, ids } = await threeStages(t, [false, false, false]);

    await t.run(async (ctx) => {
      const stage = (await ctx.db.get(ids[0]))!;
      return patchStageDatesWithCascade(ctx, {
        projectId, stage, startDate: '2026-01-01', endDate: '2026-01-10',
        patch: { name: 'שונה', progressPct: 42 },
      });
    });

    const s = await t.run(async (ctx) => ctx.db.get(ids[0]));
    expect(s!.name).toBe('שונה');
    expect(s!.progressPct).toBe(42);
  });

  test('the date arguments win over a conflicting patch', async () => {
    const t = convexTest(schema, modules);
    const { projectId, ids } = await threeStages(t, [false, false, false]);

    await t.run(async (ctx) => {
      const stage = (await ctx.db.get(ids[0]))!;
      return patchStageDatesWithCascade(ctx, {
        projectId, stage, startDate: '2026-02-01', endDate: '2026-02-10',
        // Spread first, then the explicit dates — so these must lose.
        patch: { startDate: '1999-01-01', endDate: '1999-12-31' },
      });
    });

    expect(await datesOf(t, ids[0])).toEqual({ startDate: '2026-02-01', endDate: '2026-02-10' });
  });

  test('rejects an invalid range before writing anything', async () => {
    const t = convexTest(schema, modules);
    const { projectId, ids } = await threeStages(t, [false, true, true]);

    await expect(
      t.run(async (ctx) => {
        const stage = (await ctx.db.get(ids[0]))!;
        return patchStageDatesWithCascade(ctx, {
          projectId, stage, startDate: '2026-01-20', endDate: '2026-01-01',
        });
      }),
    ).rejects.toThrow(/end date cannot be before start date/);

    // Nothing moved.
    expect(await datesOf(t, ids[0])).toEqual({ startDate: '2026-01-01', endDate: '2026-01-10' });
    expect(await datesOf(t, ids[1])).toEqual({ startDate: '2026-01-11', endDate: '2026-01-20' });
  });

  test('cascading crosses month and year boundaries correctly', async () => {
    const t = convexTest(schema, modules);
    const { projectId } = await seedProject(t);
    const ids = await t.run(async (ctx) => [
      await ctx.db.insert('stages', makeStage(projectId, {
        sortOrder: 0, startDate: '2026-12-20', endDate: '2026-12-28',
      })),
      await ctx.db.insert('stages', makeStage(projectId, {
        sortOrder: 1, startDate: '2026-12-29', endDate: '2027-01-05', dependsOnPrevious: true,
      })),
    ]);

    await t.run(async (ctx) => {
      const stage = (await ctx.db.get(ids[0]))!;
      return patchStageDatesWithCascade(ctx, {
        projectId, stage, startDate: '2026-12-20', endDate: '2026-12-31',
      });
    });

    // +3 days across the new year.
    expect(await datesOf(t, ids[1])).toEqual({ startDate: '2027-01-01', endDate: '2027-01-08' });
  });
});
