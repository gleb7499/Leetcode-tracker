import { useState, useCallback, useEffect } from 'react';
import { storage } from '../utils/storage';
import { crypto as cryptoHelper } from '../utils/crypto';
import { generateId } from '../utils/helpers';
import { AUTH_TEST_ENV } from '../config/auth-test-env';
import type {
  AuthStage,
  CurrentUser,
  PendingVerification,
  Session,
  User,
  UserSecuritySettings,
  VerificationFlow,
} from '../types';

const STORAGE_KEY_USERS = 'leetcode-tracker-users';
const STORAGE_KEY_CURRENT_USER = 'leetcode-tracker-current-user';
const STORAGE_KEY_SESSION = 'leetcode-tracker-session';
const STORAGE_KEY_PENDING_VERIFICATION = 'leetcode-tracker-pending-verification';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;
const LOGIN_SESSION_DURATION = 24 * 60 * 60 * 1000;
const VERIFICATION_TTL_MS = 10 * 60 * 1000;
const AUTH_STATE_CHANGE_EVENT = 'leetcode-tracker-auth-state-change';

function isLocalDevelopmentHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

function isTestRuntime(): boolean {
  return typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
}

type AuthRoute = '/login' | '/verify-email' | '/';

export interface AuthActionResult {
  success: boolean;
  message: string;
  nextRoute?: AuthRoute;
}

interface StoredPendingVerification {
  flow: VerificationFlow;
  email: string;
  code: string;
  createdAt: number;
  expiresAt: number;
  remember: boolean;
  loginUserId?: string;
  registerDraft?: {
    name: string;
    passwordHash: string;
    createdAt: string;
  };
}

interface AuthSnapshot {
  currentUser: CurrentUser | null;
  pendingVerification: PendingVerification | null;
}

type StoredUser = Pick<User, 'id' | 'name' | 'email' | 'passwordHash' | 'createdAt'> &
  Partial<User>;
type StoredCurrentUser = Pick<CurrentUser, 'id' | 'name' | 'email'> & Partial<CurrentUser>;

function normalizeSecuritySettings(
  settings?: Partial<UserSecuritySettings> | null,
): UserSecuritySettings {
  return {
    requireEmailCodeOnLogin: Boolean(settings?.requireEmailCodeOnLogin),
  };
}

function normalizeUser(user: StoredUser): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email.toLowerCase(),
    passwordHash: user.passwordHash,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin ?? null,
    emailVerifiedAt: user.emailVerifiedAt ?? user.createdAt,
    security: normalizeSecuritySettings(user.security),
  };
}

function toCurrentUser(user: User): CurrentUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerifiedAt: user.emailVerifiedAt,
    security: normalizeSecuritySettings(user.security),
  };
}

function normalizeCurrentUser(currentUser: StoredCurrentUser): CurrentUser {
  return {
    id: currentUser.id,
    name: currentUser.name,
    email: currentUser.email.toLowerCase(),
    emailVerifiedAt: currentUser.emailVerifiedAt ?? new Date().toISOString(),
    security: normalizeSecuritySettings(currentUser.security),
  };
}

function loadUsers(): User[] {
  const rawUsers = storage.get<StoredUser[]>(STORAGE_KEY_USERS, []) ?? [];
  const users = rawUsers
    .filter((candidate): candidate is StoredUser => {
      return Boolean(
        candidate &&
          candidate.id &&
          candidate.name &&
          candidate.email &&
          candidate.passwordHash &&
          candidate.createdAt,
      );
    })
    .map((candidate) => normalizeUser(candidate));

  storage.set(STORAGE_KEY_USERS, users);
  return users;
}

function saveUsers(users: User[]): void {
  storage.set(STORAGE_KEY_USERS, users.map((user) => normalizeUser(user)));
}

function clearSessionStorage(): void {
  storage.remove(STORAGE_KEY_SESSION);
  storage.remove(STORAGE_KEY_CURRENT_USER);
}

function clearPendingVerificationStorage(): void {
  storage.remove(STORAGE_KEY_PENDING_VERIFICATION);
}

function emitAuthStateChange(): void {
  if (isTestRuntime()) return;
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(AUTH_STATE_CHANGE_EVENT));
}

function createSession(user: User, remember: boolean): void {
  const expiresAt = remember
    ? Date.now() + SESSION_DURATION
    : Date.now() + LOGIN_SESSION_DURATION;

  const session: Session = {
    userId: user.id,
    email: user.email,
    name: user.name,
    createdAt: Date.now(),
    expiresAt,
  };

  storage.set(STORAGE_KEY_SESSION, session);
  storage.set(STORAGE_KEY_CURRENT_USER, toCurrentUser(user));
}

function loadSession(): { session: Session | null; currentUser: CurrentUser | null } {
  const session = storage.get<Session>(STORAGE_KEY_SESSION);
  if (!session) return { session: null, currentUser: null };

  if (session.expiresAt <= Date.now()) {
    clearSessionStorage();
    return { session: null, currentUser: null };
  }

  const users = loadUsers();
  const sessionUser = users.find((user) => user.id === session.userId);
  if (sessionUser) {
    const normalizedCurrent = toCurrentUser(sessionUser);
    storage.set(STORAGE_KEY_CURRENT_USER, normalizedCurrent);
    return { session, currentUser: normalizedCurrent };
  }

  const storedCurrent = storage.get<StoredCurrentUser>(STORAGE_KEY_CURRENT_USER);
  if (!storedCurrent?.id || !storedCurrent.name || !storedCurrent.email) {
    clearSessionStorage();
    return { session: null, currentUser: null };
  }

  const normalizedCurrent = normalizeCurrentUser(storedCurrent);
  storage.set(STORAGE_KEY_CURRENT_USER, normalizedCurrent);
  return { session, currentUser: normalizedCurrent };
}

function loadPendingVerification(): StoredPendingVerification | null {
  const pending = storage.get<StoredPendingVerification>(STORAGE_KEY_PENDING_VERIFICATION);
  if (!pending) return null;

  const hasValidFlow = pending.flow === 'register' || pending.flow === 'login';
  if (!hasValidFlow || !pending.email || !pending.code) {
    clearPendingVerificationStorage();
    return null;
  }

  if (pending.expiresAt <= Date.now()) {
    clearPendingVerificationStorage();
    return null;
  }

  if (pending.flow === 'register' && !pending.registerDraft) {
    clearPendingVerificationStorage();
    return null;
  }

  if (pending.flow === 'login' && !pending.loginUserId) {
    clearPendingVerificationStorage();
    return null;
  }

  return {
    ...pending,
    email: pending.email.toLowerCase(),
  };
}

function toPublicPending(
  pending: StoredPendingVerification | null,
): PendingVerification | null {
  if (!pending) return null;
  return {
    flow: pending.flow,
    email: pending.email,
    expiresAt: pending.expiresAt,
  };
}

function loadAuthSnapshot(): AuthSnapshot {
  const { currentUser } = loadSession();
  const pendingVerification = toPublicPending(loadPendingVerification());
  return {
    currentUser,
    pendingVerification,
  };
}

function generateVerificationCode(email: string): string {
  const testConfig = AUTH_TEST_ENV;
  if (
    testConfig.enabled &&
    email.toLowerCase() === testConfig.email.trim().toLowerCase()
  ) {
    return testConfig.code;
  }

  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

function createPendingVerification(params: {
  flow: VerificationFlow;
  email: string;
  remember: boolean;
  loginUserId?: string;
  registerDraft?: StoredPendingVerification['registerDraft'];
}): StoredPendingVerification {
  const code = generateVerificationCode(params.email);

  if (isLocalDevelopmentHost() && !isTestRuntime()) {
    console.info(`[Auth Debug] verification code for ${params.email}: ${code}`);
  }

  return {
    flow: params.flow,
    email: params.email.toLowerCase(),
    remember: params.remember,
    loginUserId: params.loginUserId,
    registerDraft: params.registerDraft,
    code,
    createdAt: Date.now(),
    expiresAt: Date.now() + VERIFICATION_TTL_MS,
  };
}

function isCodeAccepted(pending: StoredPendingVerification, code: string): boolean {
  if (!/^\d{6}$/.test(code)) return false;

  const testConfig = AUTH_TEST_ENV;
  const isTestAccount =
    testConfig.enabled &&
    pending.email === testConfig.email.trim().toLowerCase() &&
    code === testConfig.code;

  return isTestAccount || code === pending.code;
}

export function useAuth() {
  const [snapshot, setSnapshot] = useState<AuthSnapshot>(() => loadAuthSnapshot());
  const [isProcessing, setIsProcessing] = useState(false);

  const syncFromStorage = useCallback(() => {
    setSnapshot(loadAuthSnapshot());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStateChange = () => {
      syncFromStorage();
    };

    window.addEventListener(AUTH_STATE_CHANGE_EVENT, handleStateChange);
    window.addEventListener('storage', handleStateChange);

    return () => {
      window.removeEventListener(AUTH_STATE_CHANGE_EVENT, handleStateChange);
      window.removeEventListener('storage', handleStateChange);
    };
  }, [syncFromStorage]);

  const login = useCallback(
    async (
      email: string,
      password: string,
      remember: boolean,
    ): Promise<AuthActionResult> => {
      setIsProcessing(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 800));

        const normalizedEmail = email.trim().toLowerCase();
        const users = loadUsers();
        const user = users.find((candidate) => candidate.email === normalizedEmail);

        if (!user) {
          return { success: false, message: 'No user found with this email' };
        }

        const isValidPassword = await cryptoHelper.verifyPassword(
          password,
          user.passwordHash,
        );

        if (!isValidPassword) {
          return { success: false, message: 'Invalid password' };
        }

        if (user.security.requireEmailCodeOnLogin) {
          const pending = createPendingVerification({
            flow: 'login',
            email: user.email,
            remember,
            loginUserId: user.id,
          });

          clearSessionStorage();
          storage.set(STORAGE_KEY_PENDING_VERIFICATION, pending);
          emitAuthStateChange();
          syncFromStorage();

          return {
            success: true,
            message: 'Enter the 6-digit code sent to your email',
            nextRoute: '/verify-email',
          };
        }

        const nextUsers = users.map((candidate) =>
          candidate.id === user.id
            ? { ...candidate, lastLogin: new Date().toISOString() }
            : candidate,
        );

        const loggedInUser = nextUsers.find((candidate) => candidate.id === user.id);
        if (!loggedInUser) {
          return { success: false, message: 'Could not complete sign in' };
        }

        saveUsers(nextUsers);
        clearPendingVerificationStorage();
        createSession(loggedInUser, remember);
        emitAuthStateChange();
        syncFromStorage();

        return {
          success: true,
          message: `Welcome, ${loggedInUser.name}!`,
          nextRoute: '/',
        };
      } finally {
        setIsProcessing(false);
      }
    },
    [syncFromStorage],
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
    ): Promise<AuthActionResult> => {
      setIsProcessing(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const normalizedEmail = email.trim().toLowerCase();
        const users = loadUsers();
        if (users.some((candidate) => candidate.email === normalizedEmail)) {
          return {
            success: false,
            message: 'A user with this email is already registered',
          };
        }

        const passwordHash = await cryptoHelper.hashPassword(password);
        const pending = createPendingVerification({
          flow: 'register',
          email: normalizedEmail,
          remember: true,
          registerDraft: {
            name: name.trim(),
            passwordHash,
            createdAt: new Date().toISOString(),
          },
        });

        clearSessionStorage();
        storage.set(STORAGE_KEY_PENDING_VERIFICATION, pending);
        emitAuthStateChange();
        syncFromStorage();

        return {
          success: true,
          message: 'Registration started. Verify your email to finish creating the account.',
          nextRoute: '/verify-email',
        };
      } finally {
        setIsProcessing(false);
      }
    },
    [syncFromStorage],
  );

  const verifyEmailCode = useCallback(
    async (code: string): Promise<AuthActionResult> => {
      setIsProcessing(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 900));

        const pending = loadPendingVerification();
        if (!pending) {
          emitAuthStateChange();
          syncFromStorage();
          return {
            success: false,
            message: 'Verification session expired. Start again from login.',
            nextRoute: '/login',
          };
        }

        const normalizedCode = code.trim();
        if (!isCodeAccepted(pending, normalizedCode)) {
          return {
            success: false,
            message: 'Invalid verification code',
          };
        }

        if (pending.flow === 'register') {
          if (!pending.registerDraft) {
            clearPendingVerificationStorage();
            emitAuthStateChange();
            syncFromStorage();
            return {
              success: false,
              message: 'Verification session is invalid. Please register again.',
              nextRoute: '/login',
            };
          }

          const users = loadUsers();
          if (users.some((user) => user.email === pending.email)) {
            clearPendingVerificationStorage();
            emitAuthStateChange();
            syncFromStorage();
            return {
              success: false,
              message: 'This email is already registered. Please sign in.',
              nextRoute: '/login',
            };
          }

          const verifiedAt = new Date().toISOString();
          const newUser: User = {
            id: generateId('user'),
            name: pending.registerDraft.name,
            email: pending.email,
            passwordHash: pending.registerDraft.passwordHash,
            createdAt: pending.registerDraft.createdAt,
            lastLogin: verifiedAt,
            emailVerifiedAt: verifiedAt,
            security: normalizeSecuritySettings(undefined),
          };

          saveUsers([...users, newUser]);
          clearPendingVerificationStorage();
          createSession(newUser, pending.remember);
          emitAuthStateChange();
          syncFromStorage();

          return {
            success: true,
            message: 'Email confirmed. Account is now active.',
            nextRoute: '/',
          };
        }

        const users = loadUsers();
        const userIndex = users.findIndex(
          (candidate) =>
            candidate.id === pending.loginUserId && candidate.email === pending.email,
        );

        if (userIndex === -1) {
          clearPendingVerificationStorage();
          emitAuthStateChange();
          syncFromStorage();
          return {
            success: false,
            message: 'Verification session is no longer valid. Please sign in again.',
            nextRoute: '/login',
          };
        }

        const updatedUser: User = {
          ...users[userIndex],
          lastLogin: new Date().toISOString(),
        };
        users[userIndex] = updatedUser;

        saveUsers(users);
        clearPendingVerificationStorage();
        createSession(updatedUser, pending.remember);
        emitAuthStateChange();
        syncFromStorage();

        return {
          success: true,
          message: 'Email confirmed. Welcome back!',
          nextRoute: '/',
        };
      } finally {
        setIsProcessing(false);
      }
    },
    [syncFromStorage],
  );

  const resendEmailVerificationCode = useCallback(async (): Promise<AuthActionResult> => {
    const pending = loadPendingVerification();
    if (!pending) {
      emitAuthStateChange();
      syncFromStorage();
      return {
        success: false,
        message: 'Verification session expired. Start again from login.',
        nextRoute: '/login',
      };
    }

    const refreshed = createPendingVerification({
      flow: pending.flow,
      email: pending.email,
      remember: pending.remember,
      loginUserId: pending.loginUserId,
      registerDraft: pending.registerDraft,
    });

    storage.set(STORAGE_KEY_PENDING_VERIFICATION, refreshed);
    emitAuthStateChange();
    syncFromStorage();

    return {
      success: true,
      message: 'A new code was sent',
    };
  }, [syncFromStorage]);

  const cancelPendingVerification = useCallback(() => {
    clearPendingVerificationStorage();
    clearSessionStorage();
    emitAuthStateChange();
    syncFromStorage();
  }, [syncFromStorage]);

  const updateSecuritySettings = useCallback(
    (nextSettings: Partial<UserSecuritySettings>): boolean => {
      const session = storage.get<Session>(STORAGE_KEY_SESSION);
      if (!session) return false;

      const users = loadUsers();
      const userIndex = users.findIndex((user) => user.id === session.userId);
      if (userIndex === -1) return false;

      const updatedUser: User = {
        ...users[userIndex],
        security: {
          ...normalizeSecuritySettings(users[userIndex].security),
          ...nextSettings,
        },
      };

      users[userIndex] = updatedUser;
      saveUsers(users);
      storage.set(STORAGE_KEY_CURRENT_USER, toCurrentUser(updatedUser));
      emitAuthStateChange();
      syncFromStorage();
      return true;
    },
    [syncFromStorage],
  );

  const logout = useCallback(() => {
    clearSessionStorage();
    clearPendingVerificationStorage();
    emitAuthStateChange();
    syncFromStorage();
  }, [syncFromStorage]);

  const authStage: AuthStage = snapshot.currentUser
    ? 'authenticated'
    : snapshot.pendingVerification
      ? 'pending-verification'
      : 'anonymous';

  const testConfig = AUTH_TEST_ENV;
  const testVerificationCodeHint =
    snapshot.pendingVerification &&
    testConfig.enabled &&
    snapshot.pendingVerification.email === testConfig.email.trim().toLowerCase()
      ? testConfig.code
      : null;

  return {
    currentUser: snapshot.currentUser,
    pendingVerification: snapshot.pendingVerification,
    authStage,
    isProcessing,
    testVerificationCodeHint,
    login,
    register,
    verifyEmailCode,
    resendEmailVerificationCode,
    cancelPendingVerification,
    updateSecuritySettings,
    logout,
  };
}
