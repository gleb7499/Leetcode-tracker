import { useState } from 'react';
import { LoginSchema } from '../../shared/validation/schemas';
import type { LoginFormData } from '../../shared/validation/schemas';

interface LoginFormProps {
  onLogin: (
    email: string,
    password: string,
    remember: boolean,
  ) => Promise<{ success: boolean; message: string }>;
  onForgotPassword: () => void;
  isProcessing: boolean;
}

export function LoginForm({ onLogin, onForgotPassword, isProcessing }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<LoginFormData>>({});
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(
    null,
  );

  const validateField = (field: keyof Pick<LoginFormData, 'email' | 'password'>) => {
    const result = LoginSchema.safeParse({ email, password, remember });
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === field);
      if (issue) {
        setErrors((prev) => ({ ...prev, [field]: issue.message }));
      } else {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    } else {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = LoginSchema.safeParse({ email, password, remember });
    if (!result.success) {
      const fieldErrors: Partial<LoginFormData> = {};
      for (const issue of result.error.issues) {
        const f = issue.path[0] as keyof LoginFormData;
        if (f === 'email' || f === 'password') {
          (fieldErrors as Record<string, string>)[f] = issue.message;
        }
      }
      setErrors(fieldErrors);
      setMessage({ text: 'Пожалуйста, исправьте ошибки в форме', type: 'error' });
      return;
    }

    setMessage(null);
    const res = await onLogin(email.trim().toLowerCase(), password, remember);
    setMessage({ text: res.message, type: res.success ? 'success' : 'error' });
  };

  return (
    <form id="login-form" className="auth-form" onSubmit={handleSubmit} noValidate>
      <h2 className="form-heading">Вход в систему</h2>

      <div className="form-group">
        <label htmlFor="login-email" className="form-label">
          Email
        </label>
        <div className="input-wrapper">
          <span className="input-icon" aria-hidden="true">
            ✉️
          </span>
          <input
            type="email"
            id="login-email"
            name="email"
            className={`form-input${errors.email ? ' error' : ''}`}
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => validateField('email')}
            autoComplete="email"
            required
          />
        </div>
        {errors.email && <span className="field-error">{errors.email}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="login-password" className="form-label">
          Пароль
        </label>
        <div className="input-wrapper">
          <span className="input-icon" aria-hidden="true">
            🔒
          </span>
          <input
            type={showPassword ? 'text' : 'password'}
            id="login-password"
            name="password"
            className={`form-input${errors.password ? ' error' : ''}`}
            placeholder="Ваш пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => validateField('password')}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            className="toggle-password"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
          >
            <span className="toggle-icon">{showPassword ? '🙈' : '👁️'}</span>
          </button>
        </div>
        {errors.password && <span className="field-error">{errors.password}</span>}
      </div>

      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="remember"
            className="form-checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <span className="checkbox-text">Запомнить меня</span>
        </label>
      </div>

      <div className="auth-links">
        <button
          type="button"
          id="forgot-password-link"
          className="auth-link"
          onClick={onForgotPassword}
        >
          Забыли пароль?
        </button>
      </div>

      {message && (
        <div
          id="login-message"
          className={`auth-message show ${message.type}`}
          role="alert"
        >
          {message.text}
        </div>
      )}

      <button
        type="submit"
        className={`btn btn-primary btn-block${isProcessing ? ' loading' : ''}`}
        disabled={isProcessing}
      >
        {isProcessing ? '' : 'Войти'}
      </button>
    </form>
  );
}
