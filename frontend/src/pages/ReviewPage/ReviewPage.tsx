import { useState } from 'react';
import type { Task, ReviewStatus } from '../../shared/types';

interface ReviewPageProps {
  task: Task;
  onReview: (status: ReviewStatus) => void;
  onBack: () => void;
}

const FEEDBACK_MESSAGES: Record<ReviewStatus, string> = {
  forgot: '❌ Не помню — повторим завтра',
  partial: '⚠️ Частично помню — повторим через 3 дня',
  remember: '✅ Помню хорошо — повторим через неделю',
};

export function ReviewPage({ task, onReview, onBack }: ReviewPageProps) {
  const [feedback, setFeedback] = useState('');
  const difficultyClass = task.difficulty.toLowerCase();

  const handleReview = (status: ReviewStatus) => {
    setFeedback(FEEDBACK_MESSAGES[status]);
    setTimeout(() => {
      onReview(status);
    }, 2000);
  };

  return (
    <section id="review-screen" className="screen active" aria-labelledby="review-title">
      <div className="screen-header">
        <h2 id="review-title" className="screen-title">
          Повторение
        </h2>
        <button type="button" className="btn btn-secondary btn-small" onClick={onBack}>
          ← Назад
        </button>
      </div>

      <div id="review-card" className="review-card">
        <header className="review-card-header">
          <h3 className="review-card-title">{task.name}</h3>
          <div className="review-card-meta">
            <span className={`task-difficulty ${difficultyClass}`}>{task.difficulty}</span>
            <a
              href={task.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-small"
              aria-label="Открыть задачу на LeetCode"
            >
              Открыть на LeetCode →
            </a>
          </div>
        </header>

        <div className="review-card-body">
          {task.topics.length > 0 && (
            <section className="review-section">
              <h4 className="review-section-title">Темы</h4>
              <div className="task-topics" role="list">
                {task.topics.map((topic) => (
                  <span key={topic} className="task-topic" role="listitem">
                    {topic}
                  </span>
                ))}
              </div>
            </section>
          )}

          {task.notes && (
            <section className="review-section">
              <h4 className="review-section-title">Мои заметки</h4>
              <div className="review-section-content">{task.notes}</div>
            </section>
          )}

          {task.reviews.length > 0 && (
            <section className="review-section">
              <h4 className="review-section-title">История повторений</h4>
              <div className="review-section-content">Повторений: {task.reviews.length}</div>
            </section>
          )}
        </div>
      </div>

      <div id="review-actions" className="review-actions">
        {feedback ? (
          <div id="review-feedback" className="review-feedback show success" role="status">
            {feedback}
          </div>
        ) : (
          <div className="review-buttons">
            <button
              type="button"
              className="btn btn-review btn-forgot"
              data-status="forgot"
              onClick={() => handleReview('forgot')}
            >
              ❌ Не помню
            </button>
            <button
              type="button"
              className="btn btn-review btn-partial"
              data-status="partial"
              onClick={() => handleReview('partial')}
            >
              ⚠️ Частично
            </button>
            <button
              type="button"
              className="btn btn-review btn-remember"
              data-status="remember"
              onClick={() => handleReview('remember')}
            >
              ✅ Помню
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
