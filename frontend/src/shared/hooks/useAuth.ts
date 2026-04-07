import { useState, useCallback } from 'react';
import { storage } from '../utils/storage';
import { crypto as cryptoHelper } from '../utils/crypto';
import { generateId } from '../utils/helpers';
import type { CurrentUser, Session, User } from '../types';

const STORAGE_KEY_USERS = 'leetcode-tracker-users';
const STORAGE_KEY_CURRENT_USER = 'leetcode-tracker-current-user';
const STORAGE_KEY_SESSION = 'leetcode-tracker-session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;

function loadSession(): { session: Session | null; currentUser: CurrentUser | null } {
  const session = storage.get<Session>(STORAGE_KEY_SESSION);
  const currentUser = storage.get<CurrentUser>(STORAGE_KEY_CURRENT_USER);

  if (!session || !currentUser) return { session: null, currentUser: null };
  if (session.expiresAt <= Date.now()) {
    storage.remove(STORAGE_KEY_SESSION);
    storage.remove(STORAGE_KEY_CURRENT_USER);
    return { session: null, currentUser: null };
  }
  return { session, currentUser };
}

export function useAuth() {
  const { currentUser: initialUser } = loadSession();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(initialUser);
  const [isProcessing, setIsProcessing] = useState(false);

  const login = useCallback(
    async (
      email: string,
      password: string,
      remember: boolean,
    ): Promise<{ success: boolean; message: string }> => {
      setIsProcessing(true);
      await new Promise((r) => setTimeout(r, 800));

      const users = storage.get<User[]>(STORAGE_KEY_USERS, []) ?? [];
      const user = users.find((u) => u.email === email.toLowerCase());

      if (!user) {
        setIsProcessing(false);
        return { success: false, message: 'No user found with this email' };
      }

      const valid = await cryptoHelper.verifyPassword(password, user.passwordHash);
      if (!valid) {
        setIsProcessing(false);
        return { success: false, message: 'Invalid password' };
      }

      createSession(user, remember);
      setCurrentUser({ id: user.id, email: user.email, name: user.name });
      setIsProcessing(false);
      return { success: true, message: `Welcome, ${user.name}!` };
    },
    [],
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
    ): Promise<{ success: boolean; message: string }> => {
      setIsProcessing(true);
      await new Promise((r) => setTimeout(r, 1000));

      const users = storage.get<User[]>(STORAGE_KEY_USERS, []) ?? [];

      if (users.find((u) => u.email === email.toLowerCase())) {
        setIsProcessing(false);
        return {
          success: false,
          message: 'A user with this email is already registered',
        };
      }

      const passwordHash = await cryptoHelper.hashPassword(password);
      const user: User = {
        id: generateId('user'),
        name,
        email: email.toLowerCase(),
        passwordHash,
        createdAt: new Date().toISOString(),
        lastLogin: null,
      };

      users.push(user);
      storage.set(STORAGE_KEY_USERS, users);
      createSession(user, true);
      setCurrentUser({ id: user.id, email: user.email, name: user.name });
      setIsProcessing(false);
      return { success: true, message: 'Registration successful!' };
    },
    [],
  );

  const logout = useCallback(() => {
    storage.remove(STORAGE_KEY_SESSION);
    storage.remove(STORAGE_KEY_CURRENT_USER);
    setCurrentUser(null);
  }, []);

  return { currentUser, isProcessing, login, register, logout };
}

function createSession(user: User, remember: boolean) {
  const expiresAt = remember
    ? Date.now() + SESSION_DURATION
    : Date.now() + 24 * 60 * 60 * 1000;

  const session: Session = {
    userId: user.id,
    email: user.email,
    name: user.name,
    createdAt: Date.now(),
    expiresAt,
  };

  storage.set(STORAGE_KEY_SESSION, session);
  storage.set(STORAGE_KEY_CURRENT_USER, {
    id: user.id,
    email: user.email,
    name: user.name,
  });
}
