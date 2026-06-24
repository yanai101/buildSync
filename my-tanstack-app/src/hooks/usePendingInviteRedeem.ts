import { useEffect, useRef } from 'react';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { useNavigate } from '@tanstack/react-router';
import { api } from '../../convex/_generated/api';

const STORAGE_KEY = 'buildsync:pendingJoinCode';

/**
 * After email verification, automatically completes a pending project-invitation join.
 *
 * When a new user registers via an invitation link and their email is unverified,
 * the join code is stored in localStorage before the verification round-trip.
 * Once they click the verification email link (which lands on /register), they get
 * signed in. This hook then fires, redeems the saved invite code, and navigates
 * them to the dashboard as a project member.
 *
 * Mount once at the app root, inside ConvexAuthProvider.
 */
export function usePendingInviteRedeem() {
  const { isAuthenticated } = useConvexAuth();
  // Use server-side user as auth source of truth (mirrors JoinScreen logic)
  const currentUser = useQuery(api.users.me);
  const redeemExisting = useMutation(api.invitations.redeemInvitationExistingUser);
  const navigate = useNavigate();
  // Prevent double-firing within the same session
  const attemptedRef = useRef(false);

  useEffect(() => {
    // Wait until server confirms the session (not just client token)
    if (!isAuthenticated || currentUser == null) return;
    // Already attempted this session — don't retry
    if (attemptedRef.current) return;

    const code =
      typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!code) return;

    attemptedRef.current = true;
    // Clear immediately so a failed attempt doesn't loop
    localStorage.removeItem(STORAGE_KEY);

    redeemExisting({ code })
      .then(() => {
        navigate({ to: '/dashboard' });
      })
      .catch((err) => {
        // Terminal errors (already consumed, expired, revoked) — just log and move on.
        // The user can still navigate to the join link manually if needed.
        console.warn(
          '[PendingInviteRedeem] failed:',
          err instanceof Error ? err.message : err,
        );
      });
  }, [isAuthenticated, currentUser, redeemExisting, navigate]);
}
