import { useState, useCallback } from 'react';
import { storage } from '../utils/storage';
import { generateId, parseStringToArray } from '../utils/helpers';
import type { Task, ReviewStatus, Difficulty, ScheduleMode, TaskSource } from '../types';

const STORAGE_KEY = 'leetcode-tracker-tasks';

const REVIEW_INTERVALS: Record<ReviewStatus, number> = {
  forgot: 1,
  partial: 3,
  remember: 7,
};

function initDemoData(): Task[] {
  return [
    {
      id: generateId('task'),
      name: 'Two Sum',
      url: 'https://leetcode.com/problems/two-sum/',
      difficulty: 'Easy',
      topics: ['Array', 'Hash Table'],
      notes: 'Classic HashMap problem. One pass O(n).',
      createdAt: new Date().toISOString(),
      nextReview: new Date().toISOString(),
      reviews: [],
    },
    {
      id: generateId('task'),
      name: 'Add Two Numbers',
      url: 'https://leetcode.com/problems/add-two-numbers/',
      difficulty: 'Medium',
      topics: ['Linked List', 'Math', 'Recursion'],
      notes: 'Add numbers in reverse order using linked lists.',
      createdAt: new Date().toISOString(),
      nextReview: new Date().toISOString(),
      reviews: [],
    },
    {
      id: generateId('task'),
      name: 'Median of Two Sorted Arrays',
      url: 'https://leetcode.com/problems/median-of-two-sorted-arrays/',
      difficulty: 'Hard',
      topics: ['Array', 'Binary Search', 'Divide and Conquer'],
      notes: 'Binary search on the smaller array. Challenging problem!',
      createdAt: new Date().toISOString(),
      nextReview: new Date().toISOString(),
      reviews: [],
    },
  ];
}

function calculateNextReview(status: ReviewStatus): string {
  const days = REVIEW_INTERVALS[status] ?? 1;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function getScheduledReviewDate(scheduleMode: ScheduleMode): string {
  const date = new Date();
  if (scheduleMode === 'tomorrow') {
    date.setDate(date.getDate() + 1);
  }
  return date.toISOString();
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    return storage.get<Task[]>(STORAGE_KEY) ?? initDemoData();
  });

  const saveTasks = useCallback((updated: Task[]) => {
    storage.set(STORAGE_KEY, updated);
    setTasks(updated);
  }, []);

  const getTasksForToday = useCallback((): Task[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tasks.filter((task) => {
      const next = new Date(task.nextReview);
      next.setHours(0, 0, 0, 0);
      return next <= today;
    });
  }, [tasks]);

  const addTask = useCallback(
    (data: {
      name: string;
      url: string;
      difficulty: Difficulty;
      topics: string;
      notes: string;
      source?: TaskSource;
      sourceMeta?: Task['sourceMeta'];
      scheduleMode?: ScheduleMode;
      nextReviewAt?: string;
    }) => {
      const normalizedScheduleMode = data.scheduleMode ?? 'today';
      const nextReview = data.nextReviewAt
        ? new Date(data.nextReviewAt).toISOString()
        : getScheduledReviewDate(normalizedScheduleMode);

      const task: Task = {
        id: generateId('task'),
        name: data.name.trim(),
        url: data.url.trim(),
        difficulty: data.difficulty,
        topics: parseStringToArray(data.topics),
        notes: data.notes.trim(),
        source: data.source ?? 'leetcode',
        sourceMeta: data.sourceMeta,
        createdAt: new Date().toISOString(),
        nextReview,
        reviews: [],
      };
      const updated = [...tasks, task];
      saveTasks(updated);
      return task;
    },
    [tasks, saveTasks],
  );

  const deleteTask = useCallback(
    (taskId: string) => {
      const updated = tasks.filter((t) => t.id !== taskId);
      saveTasks(updated);
    },
    [tasks, saveTasks],
  );

  const recordReview = useCallback(
    (taskId: string, status: ReviewStatus) => {
      const updated = tasks.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          reviews: [...t.reviews, { date: new Date().toISOString(), status }],
          nextReview: calculateNextReview(status),
        };
      });
      saveTasks(updated);
    },
    [tasks, saveTasks],
  );

  const getTaskById = useCallback(
    (taskId: string): Task | undefined => {
      return tasks.find((t) => t.id === taskId);
    },
    [tasks],
  );

  return { tasks, getTasksForToday, addTask, deleteTask, recordReview, getTaskById };
}
