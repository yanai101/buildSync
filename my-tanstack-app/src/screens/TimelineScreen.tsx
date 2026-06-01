import React from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useNavigate } from '@tanstack/react-router';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Badge, Btn, Icon, Modal } from '../components/Shared';
import { ScreenBoundary } from '../components/ScreenBoundary';
import { useCurrentProject } from '../hooks/useCurrentProject';
import type { Stage } from '../types';
import { AccessDenied, AccessLoading } from '../components/AccessDenied';

type TimelineStage = Stage & {
  _id?: Id<'stages'>;
  sortOrder?: number;
};

type DragMode = 'move' | 'start' | 'end';

type DragState = {
  stageId: number;
  mode: DragMode;
  pointerId: number;
  startX: number;
  pxPerDay: number;
  originalStart: string;
  originalEnd: string;
  latestStart: string;
  latestEnd: string;
  originalStages: TimelineStage[];
};

type DragHint = {
  stageId: number;
  mode: DragMode;
  startDate: string;
  endDate: string;
  x: number;
  y: number;
} | null;

type TimelineRange = {
  start: string;
  end: string;
  totalDays: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_TIMELINE_DAYS = 30;

const TIMELINE_PADDING_START_DAYS = 2;
const TIMELINE_PADDING_END_DAYS = 5;
const BASE_DAY_WIDTH = 8;

const statusColors: Record<string, string> = {
  done: '#16A34A',
  active: '#E07A38',
  pending: '#D1D5DB',
};

const statusLabels: Record<string, string> = {
  done: 'הושלם',
  active: 'פעיל',
  pending: 'ממתין',
};

const dateOnly = (value?: string | null) => {
  if (!value) return '';
  return value.slice(0, 10);
};

const parseDate = (value: string) => {
  const [year, month, day] = dateOnly(value).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const isValidDateString = (value?: string | null) => {
  const trimmed = dateOnly(value);
  if (!trimmed || trimmed.length < 10) return false;
  return Number.isFinite(parseDate(trimmed).getTime());
};

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

const addDays = (value: string, days: number) => {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
};

const diffDays = (from: string, to: string) =>
  Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / DAY_MS);

const formatShort = (value: string) =>
  new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit' }).format(parseDate(value));

const monthLabel = (value: string) =>
  new Intl.DateTimeFormat('he-IL', { month: 'short', year: '2-digit' }).format(parseDate(value));

const formatFullDate = (value: string) =>
  new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(parseDate(value));

const clampStageDates = (startDate: string, endDate: string) => {
  if (diffDays(startDate, endDate) < 0) {
    return { startDate: endDate, endDate };
  }
  return { startDate, endDate };
};

const buildMonthMarks = (rangeStart: string, totalDays: number) => {
  const marks: { key: string; label: string; day: number }[] = [];
  const cursor = parseDate(rangeStart);
  cursor.setUTCDate(1);
  if (diffDays(rangeStart, formatDate(cursor)) < 0) {
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  while (diffDays(rangeStart, formatDate(cursor)) <= totalDays) {
    const key = formatDate(cursor);
    marks.push({ key, label: monthLabel(key), day: diffDays(rangeStart, key) });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return marks;
};

const hasValidRange = (stage: TimelineStage) =>
  isValidDateString(stage.start) &&
  isValidDateString(stage.end) &&
  diffDays(dateOnly(stage.start), dateOnly(stage.end)) >= 0;

const getTimelineRange = (stages: TimelineStage[], project: any, includeToday = false): TimelineRange => {
  const starts = stages.map(stage => dateOnly(stage.start)).filter(isValidDateString);
  const ends = stages.map(stage => dateOnly(stage.end)).filter(isValidDateString);
  const projectStart = isValidDateString(project?.startDate) ? dateOnly(project?.startDate) : '';
  const projectEnd = isValidDateString(project?.expectedEnd) ? dateOnly(project?.expectedEnd) : '';
  const fallback = formatDate(new Date());
  const rangeStarts = starts.length ? starts : [projectStart].filter(Boolean);
  const rangeEnds = ends.length ? ends : [projectEnd].filter(Boolean);
  const todayDates = includeToday ? [fallback] : [];

  const minStart = [...rangeStarts, ...todayDates].filter(Boolean).sort()[0] || fallback;
  const maxEnd = [...rangeEnds, ...todayDates].filter(Boolean).sort().at(-1) || addDays(minStart, MIN_TIMELINE_DAYS);
  const paddedStart = addDays(minStart, -TIMELINE_PADDING_START_DAYS);
  const paddedEnd = addDays(maxEnd, TIMELINE_PADDING_END_DAYS);
  const totalDays = Math.max(MIN_TIMELINE_DAYS, diffDays(paddedStart, paddedEnd));

  return { start: paddedStart, end: addDays(paddedStart, totalDays), totalDays };
};

const clampScrollLeft = (container: HTMLDivElement, value: number) => {
  const max = Math.max(0, container.scrollWidth - container.clientWidth);
  return Math.min(Math.max(0, value), max);
};

export const TimelineScreen = () => {
  const navigate = useNavigate();
  const { projectId } = useCurrentProject();
  const dbStages = useQuery(api.queries.listStages, projectId ? { projectId } : 'skip');
  const project = useQuery(api.queries.getProject, projectId ? { projectId } : 'skip');
  const updateStageDates = useMutation(api.timeline.updateStageDates);

  const [stages, setStages] = React.useState<TimelineStage[]>([]);
  const [zoom, setZoom] = React.useState(1.25);
  const [hovered, setHovered] = React.useState<number | null>(null);
  const [editingStage, setEditingStage] = React.useState<TimelineStage | null>(null);
  const [editForm, setEditForm] = React.useState({ startDate: '', endDate: '', dependsOnPrevious: false });
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [feedbackError, setFeedbackError] = React.useState<string | null>(null);
  const [timelineViewportWidth, setTimelineViewportWidth] = React.useState(0);
  const [dragHint, setDragHint] = React.useState<DragHint>(null);
  const [includeTodayInRange, setIncludeTodayInRange] = React.useState(false);
  const [lockedTimeline, setLockedTimeline] = React.useState<TimelineRange | null>(null);
  const [cascadeEnabled, setCascadeEnabled] = React.useState(true);
  const dragRef = React.useRef<DragState | null>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);

  const [labelColWidth, setLabelColWidth] = React.useState(typeof window !== 'undefined' && window.innerWidth < 768 ? 120 : 180);

  React.useEffect(() => {
    const handleResize = () => {
      setLabelColWidth(window.innerWidth < 768 ? 120 : 180);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  React.useEffect(() => {
    if (dbStages) {
      setStages(dbStages as TimelineStage[]);
    }
  }, [dbStages]);

  const accessInfo = useQuery(api.projects.getProjectAccessInfo, projectId ? { projectId } : "skip");
  const canViewSchedule = accessInfo?.canViewSchedule ?? false;
  const accessLoading = accessInfo === undefined;

  const loading = Boolean(projectId) && (dbStages === undefined || project === undefined || accessLoading);
  
  if (accessLoading) return <AccessLoading />;
  if (!canViewSchedule) return <AccessDenied message="אין לך הרשאה לצפות בלוח הזמנים של פרויקט זה." />;

  const isEmpty = !projectId || (!loading && stages.length === 0);
  const validStages = React.useMemo(() => stages.filter(hasValidRange), [stages]);
  const invalidStages = React.useMemo(() => stages.filter((s) => !hasValidRange(s)), [stages]);
  const baseTimeline = React.useMemo(
    () => getTimelineRange(validStages, project, includeTodayInRange),
    [includeTodayInRange, project, validStages],
  );
  const timeline = lockedTimeline ?? baseTimeline;
  const today = formatDate(new Date());
  const todayOffset = diffDays(timeline.start, today);
  const showToday = todayOffset >= 0 && todayOffset <= timeline.totalDays;
  const monthMarks = React.useMemo(
    () => buildMonthMarks(timeline.start, timeline.totalDays),
    [timeline.start, timeline.totalDays],
  );
  const visibleTrackWidth = Math.max(320, timelineViewportWidth - labelColWidth);
  const timelineWidth = Math.max(visibleTrackWidth, Math.round(timeline.totalDays * BASE_DAY_WIDTH * zoom));
  const didAutoScrollRef = React.useRef(false);

  const scrollToToday = React.useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (!showToday) {
      setIncludeTodayInRange(true);
      return;
    }
    const todayPx = labelColWidth + (todayOffset / timeline.totalDays) * timelineWidth;
    const target = todayPx - container.clientWidth / 2;
    container.scrollTo({ left: clampScrollLeft(container, target), top: 0, behavior: 'smooth' });
  }, [showToday, todayOffset, timeline.totalDays, timelineWidth]);

  React.useEffect(() => {
    if (!includeTodayInRange || !showToday) return;
    scrollToToday();
  }, [includeTodayInRange, scrollToToday, showToday]);

  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateWidth = () => setTimelineViewportWidth(container.clientWidth);
    updateWidth();

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    didAutoScrollRef.current = false;
  }, [projectId]);

  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (lockedTimeline || includeTodayInRange || didAutoScrollRef.current || !container || validStages.length === 0) return;

    const firstStart = validStages
      .map((s) => dateOnly(s.start))
      .filter(isValidDateString)
      .sort()[0];
    if (!firstStart) return;

    const firstOffset = diffDays(timeline.start, firstStart);
    const targetPx = labelColWidth + (firstOffset / timeline.totalDays) * timelineWidth;
    didAutoScrollRef.current = true;
    container.scrollTo({ left: clampScrollLeft(container, targetPx - 24), behavior: 'auto' });
  }, [includeTodayInRange, lockedTimeline, timeline.start, timeline.totalDays, timelineWidth, validStages]);

  const updateLocalStageDates = React.useCallback((
    stageId: number,
    startDate: string,
    endDate: string,
    cascade = false,
    previousEndDate?: string,
    baseStages?: TimelineStage[],
  ) => {
    setStages(prev => {
      const source = baseStages ?? prev;
      const endDeltaDays = cascade && previousEndDate ? diffDays(previousEndDate, endDate) : 0;
      let shiftFollowers = false;

      return source.map(stage => {
        if (stage.id === stageId) {
          shiftFollowers = endDeltaDays !== 0;
          return { ...stage, start: startDate, end: endDate };
        }
        if (!shiftFollowers) return stage;
        if (!stage.dependsOnPrevious) {
          shiftFollowers = false;
          return stage;
        }
        return {
          ...stage,
          start: addDays(dateOnly(stage.start), endDeltaDays),
          end: addDays(dateOnly(stage.end), endDeltaDays),
        };
      });
    });
  }, []);

  const applyUpdatedStageDates = React.useCallback((updatedStages?: Array<{stageId: string; startDate: string; endDate: string}>) => {
    if (!updatedStages?.length) return;
    setStages(prev => prev.map(stage => {
      const updated = updatedStages.find(item => item.stageId === stage._id);
      return updated ? { ...stage, start: updated.startDate, end: updated.endDate } : stage;
    }));
  }, []);

  const commitDates = React.useCallback(async (
    stage: TimelineStage,
    startDate: string,
    endDate: string,
    dependsOnPrevious?: boolean,
    rollbackStages?: TimelineStage[],
  ) => {
    const next = clampStageDates(startDate, endDate);
    const previousStart = dateOnly(stage.start);
    const previousEnd = dateOnly(stage.end);
    if (next.startDate === previousStart && next.endDate === previousEnd && dependsOnPrevious === stage.dependsOnPrevious) return true;
    if (!projectId || !stage._id) return false;
    const previousStages = rollbackStages ?? stages;

    setFormError(null);
    setFeedbackError(null);
    updateLocalStageDates(stage.id, next.startDate, next.endDate, cascadeEnabled, previousEnd);
    setSaving(true);
    try {
      const result = await updateStageDates({
        projectId,
        stageId: stage._id,
        startDate: next.startDate,
        endDate: next.endDate,
        dependsOnPrevious,
        cascade: cascadeEnabled,
      });
      applyUpdatedStageDates(result.updatedStages);
      return true;
    } catch (err) {
      setStages(previousStages);
      setFeedbackError(err instanceof Error ? err.message : 'לא הצלחנו לעדכן את לוח הזמנים');
      return false;
    } finally {
      setSaving(false);
    }
  }, [applyUpdatedStageDates, projectId, stages, updateLocalStageDates, updateStageDates]);

  const openEdit = (stage: TimelineStage) => {
    setEditingStage(stage);
    setEditForm({ startDate: dateOnly(stage.start), endDate: dateOnly(stage.end), dependsOnPrevious: !!stage.dependsOnPrevious });
    setFormError(null);
    setFeedbackError(null);
  };

  const submitEdit = async () => {
    if (!editingStage) return;
    if (diffDays(editForm.startDate, editForm.endDate) < 0) {
      setFormError('תאריך הסיום חייב להיות אחרי תאריך ההתחלה');
      return;
    }
    const ok = await commitDates(editingStage, editForm.startDate, editForm.endDate, editForm.dependsOnPrevious);
    if (ok) setEditingStage(null);
  };

  const beginDrag = (
    event: React.PointerEvent<HTMLDivElement>,
    stage: TimelineStage,
    mode: DragMode,
  ) => {
    if (!stage._id || saving) return;

    const track = event.currentTarget.closest('[data-timeline-track="true"]') as HTMLDivElement | null;
    if (!track) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    dragRef.current = {
      stageId: stage.id,
      mode,
      pointerId: event.pointerId,
      startX: event.clientX,
      pxPerDay: track.getBoundingClientRect().width / timeline.totalDays,
      originalStart: dateOnly(stage.start),
      originalEnd: dateOnly(stage.end),
      latestStart: dateOnly(stage.start),
      latestEnd: dateOnly(stage.end),
      originalStages: stages,
    };
    setLockedTimeline(timeline);
    setDragHint({
      stageId: stage.id,
      mode,
      startDate: dateOnly(stage.start),
      endDate: dateOnly(stage.end),
      x: event.clientX,
      y: event.clientY,
    });
  };

  const continueDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaDays = Math.round((event.clientX - drag.startX) / drag.pxPerDay);
    let nextStart = drag.originalStart;
    let nextEnd = drag.originalEnd;

    if (drag.mode === 'move') {
      nextStart = addDays(drag.originalStart, deltaDays);
      nextEnd = addDays(drag.originalEnd, deltaDays);
    } else if (drag.mode === 'start') {
      nextStart = addDays(drag.originalStart, deltaDays);
      if (diffDays(nextStart, nextEnd) < 0) nextStart = nextEnd;
    } else {
      nextEnd = addDays(drag.originalEnd, deltaDays);
      if (diffDays(nextStart, nextEnd) < 0) nextEnd = nextStart;
    }

    drag.latestStart = nextStart;
    drag.latestEnd = nextEnd;
    setDragHint({
      stageId: drag.stageId,
      mode: drag.mode,
      startDate: nextStart,
      endDate: nextEnd,
      x: event.clientX,
      y: event.clientY,
    });
    updateLocalStageDates(drag.stageId, nextStart, nextEnd, cascadeEnabled, drag.originalEnd, drag.originalStages);
  };

  const finishDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    dragRef.current = null;
    setDragHint(null);
    setLockedTimeline(null);
    const stage = stages.find(item => item.id === drag.stageId);
    if (!stage) return;

    if (drag.latestStart === drag.originalStart && drag.latestEnd === drag.originalEnd) return;
    void commitDates(
      { ...stage, start: drag.originalStart, end: drag.originalEnd },
      drag.latestStart,
      drag.latestEnd,
      stage.dependsOnPrevious,
      drag.originalStages,
    );
  };

  return (
    <>
      <ScreenBoundary
        loading={loading}
        error={null}
        isEmpty={isEmpty}
        emptyIcon="calendar"
        emptyImage="/empty_states/stages.png"
        emptyTitle="אין לוח זמנים"
        emptyDesc="לוח הזמנים נבנה מתוך שלבי הפרויקט. הגדירו שלבים ותאריכים במסך השלבים כדי להתחיל."
        emptyAction={() => navigate({ to: '/stages' })}
        emptyActionLabel="הגדר שלבים"
        onRetry={() => setFeedbackError(null)}
      >
        <div className="page-content" style={{display:"flex",flexDirection:"column",minHeight:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:16,marginBottom:16,flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:42,height:42,borderRadius:12,background:"var(--accent-light)",color:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Icon n="calendar" s={22}/>
              </div>
              <div>
                <h1 style={{fontSize:22,fontWeight:800,margin:0}}>לוח זמנים</h1>
                <div style={{fontSize:13,color:"var(--text3)",marginTop:2}}>
                  עריכת תאריכי השלבים לפי ציר זמן אינטראקטיבי
                </div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,fontWeight:600,color:cascadeEnabled?"var(--accent)":"var(--text2)",cursor:"pointer",marginRight:16,border:"1px solid",borderColor:cascadeEnabled?"var(--accent)":"var(--border)",background:cascadeEnabled?"var(--accent-light)":"#fff",padding:"4px 10px",borderRadius:12,transition:"all .2s"}}>
                <input type="checkbox" checked={cascadeEnabled} onChange={e=>setCascadeEnabled(e.target.checked)} style={{margin:0}}/>
                תזוזת מפל (Gantt)
              </label>
              <Btn variant="ghost" size="sm" onClick={scrollToToday} disabled={validStages.length === 0}>
                <Icon n="calendar" s={13}/> היום
              </Btn>
              <Btn variant="ghost" size="sm" onClick={() => setZoom(value => Math.max(0.75, value - 0.25))}>
                <Icon n="zoom-in" s={13}/> הקטן
              </Btn>
              <span style={{fontSize:12,color:"var(--text3)",fontWeight:700,minWidth:42,textAlign:"center"}}>
                {Math.round(zoom * 100)}%
              </span>
              <Btn variant="ghost" size="sm" onClick={() => setZoom(value => Math.min(2.5, value + 0.25))}>
                <Icon n="zoom-in" s={13}/> הגדל
              </Btn>
            </div>
          </div>

          {feedbackError && (
            <div style={{marginBottom:16,padding:"12px 14px",border:"1px solid var(--danger)",borderRadius:8,background:"#FEF2F2",color:"var(--danger)",fontSize:13,fontWeight:700}}>
              {feedbackError}
            </div>
          )}

          {invalidStages.length > 0 && (
            <div className="card" style={{marginBottom:16,borderColor:"var(--warning, #D97706)"}}>
              <div className="card-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
                <span>שלבים ללא תאריכים</span>
                <span style={{fontSize:12,color:"var(--text3)",fontWeight:500}}>{invalidStages.length} שלבים</span>
              </div>
              <div className="card-body" style={{padding:"4px 0"}}>
                {invalidStages.map(stage => (
                  <div
                    key={stage._id ?? stage.id}
                    style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"10px 16px",borderTop:"1px solid var(--border)"}}
                  >
                    <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
                      <div style={{width:32,height:32,borderRadius:8,background:"var(--accent-light)",color:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <Icon n={stage.icon || "layers"} s={16}/>
                      </div>
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{stage.name}</div>
                        <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>אין תאריך התחלה או סיום תקין</div>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                      <Badge type={stage.status}>{statusLabels[stage.status] || stage.status}</Badge>
                      <Btn variant="ghost" size="sm" onClick={() => openEdit(stage)} disabled={!stage._id}>
                        <Icon n="calendar" s={13}/> הגדר תאריכים
                      </Btn>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card" style={{overflow:"hidden",display:"flex",flexDirection:"column",minHeight:360,maxHeight:"calc(100vh - 220px)"}}>
            <div className="card-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
              <span>{monthLabel(timeline.start)} עד {monthLabel(timeline.end)}</span>
              <span style={{fontSize:12,color:"var(--text3)",fontWeight:500}}>
                {showToday ? `היום: ${formatShort(today)}` : 'היום מחוץ לטווח הפרויקט'}
              </span>
            </div>

            <div ref={scrollContainerRef} style={{overflow:"auto",direction:"ltr",flex:"1 1 auto",minHeight:0}}>
              <div style={{width:timelineWidth + labelColWidth,direction:"ltr"}}>
                <div style={{display:"flex",borderBottom:"1px solid var(--border)",background:"#FAFAF8",position:"sticky",top:0,zIndex:5}}>
                  <div style={{width:labelColWidth,flexShrink:0,borderLeft:"1px solid var(--border)",padding:"8px 12px",fontSize:11,fontWeight:700,color:"var(--text3)",direction:"rtl",position:"sticky",left:0,zIndex:6,background:"#FAFAF8"}}>
                    שלב
                  </div>
                  <div data-timeline-track="true" style={{width:timelineWidth,position:"relative",height:38,flexShrink:0}}>
                    {monthMarks.map(mark => (
                      <div key={mark.key} style={{position:"absolute",left:`${(mark.day / timeline.totalDays) * 100}%`,top:0,bottom:0,borderLeft:"1px solid var(--border)",paddingTop:9,paddingLeft:5,fontSize:10,color:"var(--text3)",whiteSpace:"nowrap"}}>
                        {mark.label}
                      </div>
                    ))}
                    {showToday && (
                      <div style={{position:"absolute",left:`${(todayOffset / timeline.totalDays) * 100}%`,top:0,bottom:0,width:2,background:"var(--accent)",opacity:.45,zIndex:10}}/>
                    )}
                  </div>
                </div>

                {validStages.length === 0 && (
                  <div style={{display:"flex",minHeight:80,alignItems:"center",justifyContent:"center",fontSize:12,color:"var(--text3)",direction:"rtl"}}>
                    אין שלבים עם תאריכים תקינים להצגה
                  </div>
                )}
                {validStages.map(stage => {
                  const startDay = Math.max(0, diffDays(timeline.start, dateOnly(stage.start)));
                  const duration = Math.max(1, diffDays(dateOnly(stage.start), dateOnly(stage.end)) + 1);
                  const left = (startDay / timeline.totalDays) * 100;
                  const width = Math.max(0.5, (duration / timeline.totalDays) * 100);
                  const color = statusColors[stage.status] || statusColors.pending;
                  const isPending = stage.status === 'pending';
                  const isHovered = hovered === stage.id;

                  return (
                    <div
                      key={stage._id ?? stage.id}
                      style={{display:"flex",borderBottom:"1px solid var(--border)",minHeight:48,alignItems:"center"}}
                      onMouseEnter={() => setHovered(stage.id)}
                      onMouseLeave={() => setHovered(null)}
                    >
                      <button
                        type="button"
                        onClick={() => openEdit(stage)}
                        style={{width:labelColWidth,flexShrink:0,border:"none",borderLeft:"1px solid var(--border)",padding:"8px 12px",fontSize:12,fontWeight:700,color:stage.status==="active"?"var(--accent)":stage.status==="done"?"var(--text2)":"var(--text3)",background:isHovered?"#FAFAF8":"var(--bg, #fff)",textAlign:"right",direction:"rtl",cursor:stage._id?"pointer":"default",fontFamily:"inherit",position:"sticky",left:0,zIndex:4}}
                        disabled={!stage._id}
                      >
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                          <Icon n={stage.icon || "layers"} s={14}/>
                          <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{stage.name}</span>
                        </div>
                        <div style={{fontSize:10,color:"var(--text3)",fontWeight:500,marginTop:3}}>
                          {formatShort(dateOnly(stage.start))} - {formatShort(dateOnly(stage.end))}
                        </div>
                      </button>
                      <div data-timeline-track="true" style={{width:timelineWidth,position:"relative",height:48,padding:"10px 0",flexShrink:0}}>
                        {showToday && (
                          <div style={{position:"absolute",left:`${(todayOffset / timeline.totalDays) * 100}%`,top:0,bottom:0,width:1,background:"var(--accent)",opacity:.22}}/>
                        )}
                        <div
                          onPointerDown={(event) => beginDrag(event, stage, 'move')}
                          onPointerMove={continueDrag}
                          onPointerUp={finishDrag}
                          onPointerCancel={finishDrag}
                          onDoubleClick={() => openEdit(stage)}
                          title={`${stage.name}: ${dateOnly(stage.start)} - ${dateOnly(stage.end)}`}
                          style={{
                            position:"absolute",
                            left:`${left}%`,
                            width:`${width}%`,
                            minWidth:26,
                            height:28,
                            top:10,
                            borderRadius:6,
                            background:color,
                            opacity:isHovered?1:.86,
                            transition:dragRef.current?.stageId === stage.id ? "none" : "opacity .15s",
                            display:"flex",
                            alignItems:"center",
                            justifyContent:"center",
                            padding:"0 10px",
                            overflow:"hidden",
                            cursor:stage._id && !saving ? "grab" : "default",
                            boxShadow:isHovered ? "0 8px 18px rgba(24,24,27,.14)" : "none",
                            touchAction:"none",
                          }}
                        >
                          {stage._id && (
                            <>
                              <div
                                onPointerDown={(event) => beginDrag(event, stage, 'start')}
                                style={{position:"absolute",left:0,top:0,bottom:0,width:8,cursor:"ew-resize",background:"rgba(255,255,255,.18)"}}
                              />
                              <div
                                onPointerDown={(event) => beginDrag(event, stage, 'end')}
                                style={{position:"absolute",right:0,top:0,bottom:0,width:8,cursor:"ew-resize",background:"rgba(255,255,255,.18)"}}
                              />
                            </>
                          )}
                          <span style={{fontSize:11,color:isPending?"var(--text2)":"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",direction:"rtl",fontWeight:700}}>
                            {duration >= 7 ? stage.name : ''}
                          </span>
                          {dragHint?.stageId === stage.id && (
                            <div
                              style={{
                                position:"fixed",
                                left:dragHint.x,
                                top:Math.max(12, dragHint.y - 58),
                                transform:"translateX(-50%)",
                                zIndex:50,
                                pointerEvents:"none",
                                direction:"rtl",
                                background:"#18181B",
                                color:"#fff",
                                borderRadius:8,
                                padding:"8px 10px",
                                boxShadow:"0 12px 28px rgba(0,0,0,.18)",
                                fontSize:11,
                                fontWeight:700,
                                lineHeight:1.45,
                                whiteSpace:"nowrap",
                              }}
                            >
                              <div>{dragHint.mode === 'move' ? 'הזזת שלב' : dragHint.mode === 'start' ? 'עדכון התחלה' : 'עדכון סיום'}</div>
                              <div style={{color:"rgba(255,255,255,.72)",fontWeight:600}}>
                                {formatFullDate(dragHint.startDate)} - {formatFullDate(dragHint.endDate)}
                              </div>
                              <div style={{color:"rgba(255,255,255,.72)",fontWeight:600}}>
                                {diffDays(dragHint.startDate, dragHint.endDate) + 1} ימים
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{display:"flex",gap:16,padding:"12px 16px",fontSize:11,color:"var(--text2)",direction:"rtl",borderTop:"1px solid var(--border)",background:"#FAFAF8",position:"sticky",bottom:0,zIndex:8,boxShadow:"0 -6px 14px rgba(24,24,27,.04)"}}>
              {Object.entries(statusLabels).map(([key, label]) => (
                <span key={key} style={{display:"flex",alignItems:"center",gap:5}}>
                  <span style={{width:16,height:8,background:statusColors[key],borderRadius:2,display:"inline-block"}}/>
                  {label}
                </span>
              ))}
              <span style={{display:"flex",alignItems:"center",gap:5}}>
                <span style={{width:2,height:14,background:"var(--accent)",borderRadius:1,display:"inline-block"}}/> היום
              </span>
            </div>
          </div>
        </div>
      </ScreenBoundary>

      {editingStage && (
        <Modal title="עריכת תאריכי שלב" onClose={() => setEditingStage(null)} width={480}>
          <div style={{display:"grid",gap:14}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
              <div>
                <div style={{fontSize:16,fontWeight:800}}>{editingStage.name}</div>
                <div style={{fontSize:12,color:"var(--text3)",marginTop:4}}>השינוי יישמר גם במסך שלבי הפרויקט</div>
              </div>
              <Badge type={editingStage.status}>{statusLabels[editingStage.status] || editingStage.status}</Badge>
            </div>
            <label>
              <div style={{fontSize:12,color:"var(--text2)",marginBottom:4,fontWeight:700}}>תאריך התחלה</div>
              <input className="bp-input" type="date" value={editForm.startDate} onChange={event => setEditForm(form => ({...form,startDate:event.target.value}))}/>
            </label>
            <label>
              <div style={{fontSize:12,color:"var(--text2)",marginBottom:4,fontWeight:700}}>תאריך סיום</div>
              <input className="bp-input" type="date" value={editForm.endDate} onChange={event => setEditForm(form => ({...form,endDate:event.target.value}))}/>
            </label>
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:((editingStage as any).sortOrder ?? editingStage.id - 1) <= 0?"not-allowed":"pointer",color:((editingStage as any).sortOrder ?? editingStage.id - 1) <= 0?"var(--text3)":"var(--text2)"}}>
              <input
                type="checkbox"
                checked={((editingStage as any).sortOrder ?? editingStage.id - 1) > 0 && editForm.dependsOnPrevious}
                disabled={((editingStage as any).sortOrder ?? editingStage.id - 1) <= 0}
                onChange={e=>setEditForm(f=>({...f,dependsOnPrevious:e.target.checked}))}
              />
              מחובר לשלב הקודם - שינוי בשלב הקודם יזיז גם את השלב הזה
            </label>
            {formError && <div style={{fontSize:13,color:"var(--danger)",fontWeight:700}}>{formError}</div>}
            <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:6}}>
              <Btn variant="ghost" onClick={() => setEditingStage(null)}>ביטול</Btn>
              <Btn onClick={submitEdit} disabled={saving}><Icon n="check" s={14}/> שמור שינוי</Btn>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
