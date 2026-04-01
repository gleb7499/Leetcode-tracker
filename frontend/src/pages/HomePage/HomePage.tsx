import { TaskCard } from '../../components/TaskCard/TaskCard';
import type { Task } from '../../shared/types';

interface HomePageProps {
  todayTasks: Task[];
  onReview: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onRepeatAll: () => void;
}

export function HomePage({ todayTasks, onReview, onDelete, onRepeatAll }: HomePageProps) {
  return (
    <section
      id="home-screen"
      className="screen active"
      aria-labelledby="home-title"
    >
      <div className="screen-header">
        <h2 id="home-title" className="screen-title">
          Задачи на сегодня
        </h2>
        <div className="screen-header-actions">
          <span className="tasks-count-badge">
            <span id="tasks-count">{todayTasks.length}</span> задач
          </span>
          <button
            type="button"
            id="repeat-all-btn"
            className="btn btn-primary"
            onClick={onRepeatAll}
            disabled={todayTasks.length === 0}
          >
            🔄 Повторить все
          </button>
        </div>
      </div>

      <div id="tasks-list" className="tasks-list" role="list" aria-label="Список задач">
        {todayTasks.length === 0 ? (
          <div id="empty-state" className="empty-state" role="status">
            <div className="empty-state-icon" aria-hidden="true">
              🎉
            </div>
            <h3 className="empty-state-title">Все задачи повторены!</h3>
            <p className="empty-state-description">
              На сегодня больше нет задач для повторения. Отличная работа!
            </p>
          </div>
        ) : (
          todayTasks.map((task) => (
            <TaskCard key={task.id} task={task} onReview={onReview} onDelete={onDelete} />
          ))
        )}
      </div>
    </section>
  );
}
