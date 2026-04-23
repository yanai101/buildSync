import { convexAuth } from '@convex-dev/auth/server';
import { Password } from '@convex-dev/auth/providers/Password';
import Google from '@auth/core/providers/google';

// Self-registration is owner-only. Other roles (manager / inspector / contractor)
// are added later by an owner — out of scope for this pass.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        return {
          email: params.email as string,
          name: (params.name as string | undefined) ?? undefined,
          phone: (params.phone as string | undefined) ?? undefined,
          role: 'owner' as const,
        };
      },
    }),
    Google,
  ],
});
