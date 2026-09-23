import { useState, useCallback, useEffect, useRef } from 'react';
import { tasksApi, mapTaskDto, type TaskCreatePayload } from '../api/tasks';
import type { Task, ReviewStatus, Difficulty, TaskSource } from '../types';

export interface AddTaskInput {
  name: string;
  url: string;
  difficulty: Difficulty;
  topics: string;
  notes: string;
  source?: TaskSource;
  sourceMeta?: Task['sourceMeta'];
  scheduleMode?: 'today' | 'tomorrow';
  nextReviewAt?: string;
}

function mergeTask(tasks: Task[], next: Task): Task[] {
  const index = tasks.findIndex((task) => task.id === next.id);
  if (index === -1) return [...tasks, next];
  const copy = [...tasks];
  copy[index] = next;
  return copy;
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [all, today] = await Promise.all([tasksApi.list(), tasksApi.today()]);
      if (!mountedRef.current) return;
      setTasks(all.map(mapTaskDto));
      setTodayTasks(today.map(mapTaskDto));
      setError(null);
    } catch {
      if (!mountedRef.current) return;
      setError('Could not load tasks. Is the backend running?');
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const getTasksForToday = useCallback((): Task[] => todayTasks, [todayTasks]);

  const addTask = useCallback(
    (data: AddTaskInput): Promise<Task> => {
      // The backend is the source of truth for scheduling: every added task
      // is due today. The UI "today"/"tomorrow" choice is kept for UX, but
      // both map to the default spaced-repetition schedule server-side.
      const payload: TaskCreatePayload = {
        name: data.name.trim(),
        url: data.url.trim(),
        difficulty: data.difficulty,
        topics: data.topics
          .split(',')
          .map((topic) => topic.trim())
          .filter(Boolean),
        notes: data.notes.trim(),
        scheduleMode: 'spaced_repetition',
      };

      return tasksApi.create(payload).then((dto) => {
        const task = mapTaskDto(dto);
        if (!mountedRef.current) return task;
        setTasks((prev) => mergeTask(prev, task));
        setTodayTasks((prev) => mergeTask(prev, task));
        return task;
      });
    },
    [],
  );

  const deleteTask = useCallback((taskId: string): Promise<void> => {
    return tasksApi.remove(taskId).then(() => {
      if (!mountedRef.current) return;
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      setTodayTasks((prev) => prev.filter((task) => task.id !== taskId));
    });
  }, []);

  const recordReview = useCallback(
    (taskId: string, status: ReviewStatus): Promise<Task> => {
      return tasksApi.review(taskId, status).then((dto) => {
        const task = mapTaskDto(dto);
        if (!mountedRef.current) return task;
        setTasks((prev) => mergeTask(prev, task));
        // The backend recomputes due dates; re-sync the review queue so a
        // task rescheduled for a future day leaves today's list.
        void tasksApi.today().then((today) => {
          if (mountedRef.current) setTodayTasks(today.map(mapTaskDto));
        });
        return task;
      });
    },
    [],
  );

  const getTaskById = useCallback(
    (taskId: string): Task | undefined => {
      return tasks.find((task) => task.id === taskId);
    },
    [tasks],
  );

  return {
    tasks,
    isLoading,
    error,
    refresh,
    getTasksForToday,
    addTask,
    deleteTask,
    recordReview,
    getTaskById,
  };
}
