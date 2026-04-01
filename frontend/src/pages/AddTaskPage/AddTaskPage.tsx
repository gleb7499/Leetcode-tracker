import { useState } from 'react';
import { TaskSchema } from '../../shared/validation/schemas';
import type { Difficulty } from '../../shared/types';

interface AddTaskPageProps {
  onAdd: (data: {
    name: string;
    url: string;
    difficulty: Difficulty;
    topics: string;
    notes: string;
  }) => void;
  onCancel: () => void;
}

interface FormErrors {
  url?: string;
  name?: string;
  difficulty?: string;
}

export function AddTaskPage({ onAdd, onCancel }: AddTaskPageProps) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('');
  const [topics, setTopics] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [successMsg, setSuccessMsg] = useState('');

  const validate = (): boolean => {
    const result = TaskSchema.safeParse({ url, name, difficulty, topics, notes });
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FormErrors;
        fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleBlur = (field: keyof FormErrors) => {
    const partial = TaskSchema.safeParse({ url, name, difficulty, topics, notes });
    if (!partial.success) {
      const fieldErrors: FormErrors = { ...errors };
      const issue = partial.error.issues.find((i) => i.path[0] === field);
      if (issue) {
        fieldErrors[field] = issue.message;
      } else {
        delete fieldErrors[field];
      }
      setErrors(fieldErrors);
    } else {
      const updated = { ...errors };
      delete updated[field];
      setErrors(updated);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onAdd({
      url,
      name,
      difficulty: difficulty as Difficulty,
      topics,
      notes,
    });

    setSuccessMsg('✅ Задача успешно добавлена!');
    setTimeout(() => {
      setSuccessMsg('');
      setUrl('');
      setName('');
      setDifficulty('');
      setTopics('');
      setNotes('');
      setErrors({});
      onCancel();
    }, 1500);
  };

  return (
    <section id="add-screen" className="screen active" aria-labelledby="add-title">
      <div className="screen-header">
        <h2 id="add-title" className="screen-title">
          Добавить задачу
        </h2>
      </div>

      <form id="add-task-form" className="task-form" onSubmit={handleSubmit} noValidate>
        {successMsg && (
          <div id="form-success" className="form-success show" role="status">
            {successMsg}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="task-url" className="form-label">
            URL задачи <span aria-hidden="true">*</span>
          </label>
          <input
            type="url"
            id="task-url"
            name="url"
            className={`form-input${errors.url ? ' error' : ''}`}
            placeholder="https://leetcode.com/problems/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={() => handleBlur('url')}
            required
            aria-describedby={errors.url ? 'url-error' : undefined}
          />
          {errors.url && (
            <span id="url-error" className="field-error" role="alert">
              {errors.url}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="task-name" className="form-label">
            Название задачи <span aria-hidden="true">*</span>
          </label>
          <input
            type="text"
            id="task-name"
            name="name"
            className={`form-input${errors.name ? ' error' : ''}`}
            placeholder="Например: Two Sum"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => handleBlur('name')}
            required
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
          {errors.name && (
            <span id="name-error" className="field-error" role="alert">
              {errors.name}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="task-difficulty" className="form-label">
            Сложность <span aria-hidden="true">*</span>
          </label>
          <select
            id="task-difficulty"
            name="difficulty"
            className={`form-input form-select${errors.difficulty ? ' error' : ''}`}
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            onBlur={() => handleBlur('difficulty')}
            required
            aria-describedby={errors.difficulty ? 'difficulty-error' : undefined}
          >
            <option value="">Выберите сложность</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
          {errors.difficulty && (
            <span id="difficulty-error" className="field-error" role="alert">
              {errors.difficulty}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="task-topics" className="form-label">
            Темы (через запятую)
          </label>
          <input
            type="text"
            id="task-topics"
            name="topics"
            className="form-input"
            placeholder="Array, Hash Table, Dynamic Programming..."
            value={topics}
            onChange={(e) => setTopics(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="task-notes" className="form-label">
            Заметки
          </label>
          <textarea
            id="task-notes"
            name="notes"
            className="form-input form-textarea"
            placeholder="Ключевые идеи, подходы к решению..."
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="form-actions">
          <button
            type="button"
            id="cancel-task-btn"
            className="btn btn-secondary"
            onClick={onCancel}
          >
            Отмена
          </button>
          <button type="submit" className="btn btn-primary">
            Добавить задачу
          </button>
        </div>
      </form>
    </section>
  );
}
