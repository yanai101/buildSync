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
          role: 'owner' as const,
        };
      },
    }),
  ],
});
