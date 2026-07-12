import { convexAuth } from '@convex-dev/auth/server';
import { Password } from '@convex-dev/auth/providers/Password';
import Google from '@auth/core/providers/google';
import { ResendOTP } from './ResendOTP';

// Self-registration is owner-only. Other roles (manager / inspector / contractor)
// are added later by an owner — out of scope for this pass.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      verify: ResendOTP,
      profile(params) {
        return {
          email: params.email as string,
          role: 'owner' as const,
          ...((params.name as string | undefined)
            ? { name: params.name as string }
            : {}),
          ...((params.phone as string | undefined)
            ? { phone: params.phone as string }
            : {}),
        };
      },
    }),
    Google({
      profile(googleProfile) {
        return {
          id: googleProfile.sub,
          name: googleProfile.name,
          email: googleProfile.email,
          image: googleProfile.picture,
          emailVerified: googleProfile.email_verified,
          role: 'owner' as const,
        };
      },
    }),
  ],
  callbacks: {
    // Without this, Convex Auth creates a brand-new `users` row per
    // provider — a user who signs up with email+password and later signs
    // in with Google (same address) ends up as two disconnected accounts,
    // each with its own role and project associations. This callback links
    // them by (verified) email instead, while never clobbering an existing
    // account's role/name/phone with defaults from the incoming profile
    // (the Password/Google `profile()` above always says `role: 'owner'`,
    // which must not overwrite an invited manager/inspector/contractor).
    async createOrUpdateUser(ctx, args) {
      const { existingUserId, provider, profile, shouldLink } = args;
      const rawEmail = typeof profile.email === 'string' ? profile.email : undefined;
      const email = rawEmail ? rawEmail.trim().toLowerCase() : undefined;

      const emailVerified =
        profile.emailVerified ??
        ((provider.type === 'oauth' || provider.type === 'oidc') &&
          (provider as { allowDangerousEmailAccountLinking?: boolean })
            .allowDangerousEmailAccountLinking !== false);

      // Only ever add missing fields to a user document — never overwrite
      // existing name/phone/image/role with values from a fresh sign-in.
      const gentlePatch = (existing: {
        name?: string;
        image?: string;
        emailVerificationTime?: number;
      }) => {
        const patch: Record<string, unknown> = {};
        if (email) patch.email = email;
        if (!existing.name && typeof profile.name === 'string' && profile.name) {
          patch.name = profile.name;
        }
        if (!existing.image && typeof profile.image === 'string' && profile.image) {
          patch.image = profile.image;
        }
        if (emailVerified && !existing.emailVerificationTime) {
          patch.emailVerificationTime = Date.now();
        }
        return patch;
      };

      // 1. Sign-in to an account already tied to this provider — just
      // refresh incidental fields, keep everything else as-is.
      if (existingUserId !== null) {
        const existing = await ctx.db.get(existingUserId);
        const patch = existing ? gentlePatch(existing as any) : {};
        if (Object.keys(patch).length > 0) {
          await ctx.db.patch(existingUserId, patch);
        }
        return existingUserId;
      }

      // 2. First sign-in via this provider — try to link to an existing
      // user by verified email so password + Google accounts converge.
      const shouldLinkViaEmail = shouldLink || emailVerified || provider.type === 'email';
      if (email && shouldLinkViaEmail) {
        const matches = await (ctx.db.query('users') as any)
          .withIndex('email', (q: any) => q.eq('email', email))
          .collect();
        if (matches.length > 0) {
          // If duplicates still exist from before this callback existed,
          // pick deterministically (oldest account) rather than create a
          // third one.
          const target = matches.reduce((a: any, b: any) =>
            a._creationTime <= b._creationTime ? a : b,
          );
          const patch = gentlePatch(target);
          if (Object.keys(patch).length > 0) {
            await ctx.db.patch(target._id, patch);
          }
          return target._id;
        }
      }

      // 3. No existing user to link to — create one (mirrors the library's
      // default behavior).
      const { emailVerified: _ev, phoneVerified: _pv, ...restProfile } = profile as Record<
        string,
        unknown
      >;
      const userData: Record<string, unknown> = {
        ...restProfile,
        ...(email ? { email } : {}),
        ...(emailVerified ? { emailVerificationTime: Date.now() } : {}),
      };
      return await ctx.db.insert('users', userData as any);
    },
  },
});
