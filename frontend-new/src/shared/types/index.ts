export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type ReviewStatus = 'forgot' | 'partial' | 'remember';
export type TaskSource = 'leetcode' | 'custom';
export type ScheduleMode = 'today' | 'tomorrow';

export interface Review {
  date: string;
  status: ReviewStatus;
}

export interface Task {
  id: string;
  name: string;
  url: string;
  difficulty: Difficulty;
  topics: string[];
  notes: string;
  source: TaskSource;
  sourceMeta?: {
    sourceTaskId?: string;
    slug?: string;
    catalogHit?: boolean;
    [key: string]: string | number | boolean | undefined;
  };
  createdAt: string;
  nextReview: string;
  reviews: Review[];
}

export interface ResolvedTaskDraft {
  source: TaskSource;
  name: string;
  url: string;
  difficulty: Difficulty;
  topics: string[];
  notes?: string;
  sourceMeta?: Task['sourceMeta'];
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  lastLogin: string | null;
}

export interface Session {
  userId: string;
  email: string;
  name: string;
  createdAt: number;
  expiresAt: number;
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
}

export type Screen = 'home' | 'add' | 'review' | 'stats' | 'settings';
