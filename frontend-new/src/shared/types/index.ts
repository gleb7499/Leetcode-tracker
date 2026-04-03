export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type ReviewStatus = 'forgot' | 'partial' | 'remember';

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
  createdAt: string;
  nextReview: string;
  reviews: Review[];
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
