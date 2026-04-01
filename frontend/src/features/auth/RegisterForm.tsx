import { useState } from 'react';
import { RegisterSchema } from '../../shared/validation/schemas';
import { PasswordStrength } from './PasswordStrength';

interface RegisterFormProps {
  onRegister: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ success: boolean; message: string }>;
  isProcessing: boolean;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  passwordConfirm?: string;
  terms?: string;
}

export function RegisterForm({ onRegister, isProcessing }: RegisterFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [terms, setTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(
    null,
  );

  const validateField = (field: keyof FormErrors) => {
    const result = RegisterSchema.safeParse({
      name,
      email,
      password,
      passwordConfirm,
      terms: terms || (undefined as unknown as true),
    });
    const updated = { ...errors };
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === field);
      if (issue) {
        updated[field] = issue.message;
      } else {
        delete updated[field];
      }
    } else {
      delete updated[field];
    }
    setErrors(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = RegisterSchema.safeParse({
      name,
      email,
      password,
      passwordConfirm,
      terms: terms || (undefined as unknown as true),
    });

    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const f = issue.path[0] as keyof FormErrors;
        fieldErrors[f] = issue.message;
      }
      setErrors(fieldErrors);
      setMessage({ text: 'Пожалуйста, исправьте ошибки в форме', type: 'error' });
      return;
    }

    setMessage(null);
    const res = await onRegister(name.trim(), email.trim().toLowerCase(), password);
    setMessage({ text: res.message, type: res.success ? 'success' : 'error' });
  };

  return (
    <form id="register-form" className="auth-form" onSubmit={handleSubmit} noValidate>
      <h2 className="form-heading">Регистрация</h2>

      <div className="form-group">
        <label htmlFor="register-name" className="form-label">
          Имя
        </label>
        <div className="input-wrapper">
          <span className="input-icon" aria-hidden="true">
            👤
          </span>
          <input
            type="text"
            id="register-name"
            name="name"
            className={`form-input${errors.name ? ' error' : ''}`}
            placeholder="Ваше имя"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => validateField('name')}
            autoComplete="name"
            required
          />
        </div>
        {errors.name && <span className="field-error">{errors.name}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="register-email" className="form-label">
          Email
        </label>
        <div className="input-wrapper">
          <span className="input-icon" aria-hidden="true">
            ✉️
          </span>
          <input
            type="email"
            id="register-email"
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
        <label htmlFor="register-password" className="form-label">
          Пароль
        </label>
        <div className="input-wrapper">
          <span className="input-icon" aria-hidden="true">
            🔒
          </span>
          <input
            type={showPassword ? 'text' : 'password'}
            id="register-password"
            name="password"
            className={`form-input${errors.password ? ' error' : ''}`}
            placeholder="Минимум 8 символов"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => validateField('password')}
            autoComplete="new-password"
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
        <PasswordStrength password={password} />
      </div>

      <div className="form-group">
        <label htmlFor="register-password-confirm" className="form-label">
          Подтверждение пароля
        </label>
        <div className="input-wrapper">
          <span className="input-icon" aria-hidden="true">
            🔒
          </span>
          <input
            type={showPasswordConfirm ? 'text' : 'password'}
            id="register-password-confirm"
            name="passwordConfirm"
            className={`form-input${errors.passwordConfirm ? ' error' : ''}`}
            placeholder="Повторите пароль"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            onBlur={() => validateField('passwordConfirm')}
            autoComplete="new-password"
            required
          />
          <button
            type="button"
            className="toggle-password"
            onClick={() => setShowPasswordConfirm((v) => !v)}
            aria-label={showPasswordConfirm ? 'Скрыть пароль' : 'Показать пароль'}
          >
            <span className="toggle-icon">{showPasswordConfirm ? '🙈' : '👁️'}</span>
          </button>
        </div>
        {errors.passwordConfirm && (
          <span className="field-error">{errors.passwordConfirm}</span>
        )}
      </div>

      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            id="accept-terms"
            name="terms"
            className="form-checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
          />
          <span className="checkbox-text">
            Я принимаю{' '}
            <a href="#" onClick={(e) => e.preventDefault()}>
              условия использования
            </a>
          </span>
        </label>
        {errors.terms && <span className="field-error">{errors.terms}</span>}
      </div>

      {message && (
        <div
          id="register-message"
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
        {isProcessing ? '' : 'Зарегистрироваться'}
      </button>
    </form>
  );
}
