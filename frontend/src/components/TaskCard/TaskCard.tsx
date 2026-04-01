import type { Task } from '../../shared/types';

interface TaskCardProps {
  task: Task;
  onReview: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

export function TaskCard({ task, onReview, onDelete }: TaskCardProps) {
  const difficultyClass = task.difficulty.toLowerCase();

  return (
    <article className="task-card" role="article" aria-label={`Задача: ${task.name}`}>
      <header className="task-card-header">
        <h3 className="task-card-title">
          <a
            href={task.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Открыть задачу ${task.name} на LeetCode`}
          >
            {task.name}
          </a>
        </h3>
        <span
          className={`task-difficulty ${difficultyClass}`}
          aria-label={`Сложность: ${task.difficulty}`}
        >
          {task.difficulty}
        </span>
      </header>

      {task.topics.length > 0 && (
        <div className="task-topics" role="list" aria-label="Темы задачи">
          {task.topics.map((topic) => (
            <span key={topic} className="task-topic" role="listitem">
              {topic}
            </span>
          ))}
        </div>
      )}

      {task.notes && <p className="task-notes">{task.notes}</p>}

      <div className="task-card-actions">
        <button
          type="button"
          className="btn btn-primary btn-small"
          onClick={() => onReview(task.id)}
          aria-label={`Решить задачу ${task.name}`}
        >
          Решить
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          onClick={() => onDelete(task.id)}
          aria-label={`Удалить задачу ${task.name}`}
        >
          Удалить
        </button>
      </div>
    </article>
  );
}
