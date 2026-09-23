import { useState, useCallback, useEffect, useSyncExternalStore } from 'react';
import { authApi, type AuthPayload } from '../api/auth';
import {
  applySession,
  clearPendingVerification,
  clearSession,
  getSessionSnapshot,
  initializeSession,
  setPendingVerification,
  subscribeSession,
} from '../api/session-store';
import { tokenStorage } from '../api/tokens';
import { ApiError } from '../api/client';
import type { AuthStage, CurrentUser, PendingVerification } from '../types';

type AuthRoute = '/login' | '/verify-email' | '/';

export interface AuthActionResult {
  success: boolean;
  message: string;
  nextRoute?: AuthRoute;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function useAuth() {
  const snapshot = useSyncExternalStore(subscribeSession, getSessionSnapshot);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    void initializeSession();
  }, []);

  const login = useCallback(
    async (email: string, password: string, remember: boolean): Promise<AuthActionResult> => {
      setIsProcessing(true);
      try {
        const payload: AuthPayload = await authApi.login(email.trim().toLowerCase(), password);
        applySession(payload.user, payload, remember);
        return { success: true, message: payload.message, nextRoute: '/' };
      } catch (error) {
        return { success: false, message: errorMessage(error, 'Could not sign in') };
      } finally {
        setIsProcessing(false);
      }
    },
    [],
  );

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<AuthActionResult> => {
      setIsProcessing(true);
      try {
        const normalizedEmail = email.trim().toLowerCase();
        const payload = await authApi.register(name.trim(), normalizedEmail, password);
        setPendingVerification({ flow: 'register', email: normalizedEmail });
        return {
          success: true,
          message: payload.message,
          nextRoute: '/verify-email',
        };
      } catch (error) {
        return { success: false, message: errorMessage(error, 'Could not register') };
      } finally {
        setIsProcessing(false);
      }
    },
    [],
  );

  const verifyEmailCode = useCallback(
    async (code: string): Promise<AuthActionResult> => {
      const pending = getSessionSnapshot().pendingVerification;
      if (!pending) {
        return {
          success: false,
          message: 'Verification session expired. Start again from login.',
          nextRoute: '/login',
        };
      }

      setIsProcessing(true);
      try {
        const payload = await authApi.confirmEmailVerification(pending.email, code.trim());
        applySession(payload.user, payload, true);
        return { success: true, message: payload.message, nextRoute: '/' };
      } catch (error) {
        return { success: false, message: errorMessage(error, 'Invalid verification code') };
      } finally {
        setIsProcessing(false);
      }
    },
    [],
  );

  const resendEmailVerificationCode = useCallback(async (): Promise<AuthActionResult> => {
    const pending = getSessionSnapshot().pendingVerification;
    if (!pending) {
      return {
        success: false,
        message: 'Verification session expired. Start again from login.',
        nextRoute: '/login',
      };
    }

    setIsProcessing(true);
    try {
      const payload = await authApi.requestEmailVerification(pending.email);
      return { success: true, message: payload.message };
    } catch (error) {
      return { success: false, message: errorMessage(error, 'Could not resend the code') };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const cancelPendingVerification = useCallback(() => {
    clearPendingVerification();
    clearSession();
  }, []);

  const logout = useCallback(() => {
    const refreshToken = tokenStorage.getRefreshToken();
    // Revoke on the server first (best effort). Local state is cleared only
    // after the request settles so the in-flight call can still refresh an
    // expired access token; a failed revocation never blocks sign-out.
    void authApi
      .logout(refreshToken)
      .catch(() => {
        // Local session is cleared regardless; a failed server-side
        // revocation must not block sign-out.
      })
      .finally(() => {
        clearSession();
      });
  }, []);

  const currentUser: CurrentUser | null = snapshot.currentUser;
  const pendingVerification: PendingVerification | null = snapshot.pendingVerification;

  let authStage: AuthStage = 'anonymous';
  if (snapshot.isInitializing) {
    authStage = 'loading';
  } else if (currentUser) {
    authStage = 'authenticated';
  } else if (pendingVerification) {
    authStage = 'pending-verification';
  }

  return {
    currentUser,
    pendingVerification,
    authStage,
    isProcessing,
    login,
    register,
    verifyEmailCode,
    resendEmailVerificationCode,
    cancelPendingVerification,
    logout,
  };
}
