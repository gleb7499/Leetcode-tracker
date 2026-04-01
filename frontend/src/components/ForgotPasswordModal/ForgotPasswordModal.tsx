import { useState } from 'react';
import { delay } from '../../shared/utils/helpers';

interface ForgotPasswordModalProps {
  onClose: () => void;
}

export function ForgotPasswordModal({ onClose }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();

    if (!trimmed) {
      setEmailError('Введите email адрес');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setEmailError('Введите корректный email');
      return;
    }

    setEmailError('');
    setLoading(true);
    await delay(1500);
    setLoading(false);
    setMessage({
      text: 'Если аккаунт с таким email существует, вы получите письмо с инструкциями',
      type: 'success',
    });
  };

  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-modal-title"
    >
      <div className="modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title" id="forgot-modal-title">
            Восстановление пароля
          </h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Закрыть модальное окно"
          >
            ×
          </button>
        </div>
        <div className="modal-body">
          <p className="modal-description">
            Введите email адрес, указанный при регистрации. Мы отправим инструкции по
            восстановлению пароля.
          </p>
          <form id="forgot-password-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="forgot-email" className="form-label">
                Email адрес
              </label>
              <div className="input-wrapper">
                <span className="input-icon" aria-hidden="true">
                  ✉️
                </span>
                <input
                  type="email"
                  id="forgot-email"
                  className={`form-input${emailError ? ' error' : ''}`}
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              {emailError && <span className="field-error">{emailError}</span>}
            </div>

            {message && (
              <div className={`auth-message show ${message.type}`} role="alert">
                {message.text}
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary modal-cancel"
                onClick={onClose}
              >
                Отмена
              </button>
              <button
                type="submit"
                className={`btn btn-primary${loading ? ' loading' : ''}`}
                disabled={loading}
              >
                {loading ? '' : 'Отправить'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
