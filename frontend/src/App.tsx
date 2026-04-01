import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from './components/Header/AppHeader';
import { AppNav } from './components/Navigation/AppNav';
import { AppFooter } from './components/Footer/AppFooter';
import { HomePage } from './pages/HomePage/HomePage';
import { AddTaskPage } from './pages/AddTaskPage/AddTaskPage';
import { ReviewPage } from './pages/ReviewPage/ReviewPage';
import { StatsPage } from './pages/StatsPage/StatsPage';
import { SettingsPage } from './pages/SettingsPage/SettingsPage';
import { useAuth } from './shared/hooks/useAuth';
import { useTasks } from './shared/hooks/useTasks';
import { useState } from 'react';
import type { Screen } from './shared/types';
import type { ReviewStatus, Difficulty } from './shared/types';

export default function App() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { getTasksForToday, addTask, deleteTask, recordReview, getTaskById } = useTasks();

  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [reviewTaskId, setReviewTaskId] = useState<string | null>(null);
  const [reviewQueue, setReviewQueue] = useState<string[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!currentUser) {
      navigate('/login', { replace: true });
    }
  }, [currentUser, navigate]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && currentScreen !== 'home') {
        setCurrentScreen('home');
      }
      if (e.altKey) {
        const map: Record<string, Screen> = {
          '1': 'home',
          '2': 'add',
          '3': 'stats',
          '4': 'settings',
        };
        if (map[e.key]) {
          e.preventDefault();
          setCurrentScreen(map[e.key]);
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [currentScreen]);

  // Auto-hide notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleLogout = useCallback(() => {
    if (window.confirm('Вы уверены, что хотите выйти?')) {
      logout();
      navigate('/login', { replace: true });
    }
  }, [logout, navigate]);

  const handleNavigate = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  const handleRepeatAll = () => {
    const todayTasks = getTasksForToday();
    if (todayTasks.length === 0) {
      alert('Нет задач для повторения');
      return;
    }
    const queue = todayTasks.map((t) => t.id);
    setReviewQueue(queue.slice(1));
    setReviewTaskId(queue[0]);
    setCurrentScreen('review');
  };

  const handleStartReview = (taskId: string) => {
    setReviewTaskId(taskId);
    setReviewQueue([]);
    setCurrentScreen('review');
  };

  const handleDeleteTask = (taskId: string) => {
    const task = getTaskById(taskId);
    if (!task) return;
    if (window.confirm(`Вы уверены, что хотите удалить задачу "${task.name}"?`)) {
      deleteTask(taskId);
      setNotification('Задача удалена');
    }
  };

  const handleReviewDone = (status: ReviewStatus) => {
    if (!reviewTaskId) return;
    recordReview(reviewTaskId, status);

    if (reviewQueue.length > 0) {
      const [next, ...rest] = reviewQueue;
      setReviewTaskId(next);
      setReviewQueue(rest);
    } else {
      setCurrentScreen('home');
      setReviewTaskId(null);
      setNotification('✅ Повторение записано!');
    }
  };

  const handleAddTask = (data: {
    name: string;
    url: string;
    difficulty: Difficulty;
    topics: string;
    notes: string;
  }) => {
    addTask(data);
  };

  if (!currentUser) return null;

  const todayTasks = getTasksForToday();
  const reviewTask = reviewTaskId ? getTaskById(reviewTaskId) : null;

  return (
    <>
      <AppHeader userName={currentUser.name} onLogout={handleLogout} />

      {notification && (
        <div
          className="app-notification"
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: '1rem',
            right: '1rem',
            zIndex: 9999,
            background: 'var(--color-success)',
            color: '#fff',
            padding: '0.75rem 1.25rem',
            borderRadius: '0.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          {notification}
        </div>
      )}

      <div className="app-container">
        <AppNav currentScreen={currentScreen} onNavigate={handleNavigate} />

        <main className="app-main" id="main-content" role="main">
        {currentScreen === 'home' && (
          <HomePage
            todayTasks={todayTasks}
            onReview={handleStartReview}
            onDelete={handleDeleteTask}
            onRepeatAll={handleRepeatAll}
          />
        )}
        {currentScreen === 'add' && (
          <AddTaskPage onAdd={handleAddTask} onCancel={() => setCurrentScreen('home')} />
        )}
        {currentScreen === 'review' && reviewTask && (
          <ReviewPage
            task={reviewTask}
            onReview={handleReviewDone}
            onBack={() => setCurrentScreen('home')}
          />
        )}
        {currentScreen === 'review' && !reviewTask && (
          <HomePage
            todayTasks={todayTasks}
            onReview={handleStartReview}
            onDelete={handleDeleteTask}
            onRepeatAll={handleRepeatAll}
          />
        )}
        {currentScreen === 'stats' && <StatsPage />}
        {currentScreen === 'settings' && <SettingsPage />}
      </main>
      </div>

      <AppFooter />
    </>
  );
}
