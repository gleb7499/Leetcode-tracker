interface PasswordStrengthProps {
  password: string;
}

function calculateStrength(password: string): { level: 0 | 1 | 2 | 3; label: string } {
  if (!password) return { level: 0, label: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Za-z]/.test(password) && /\d/.test(password)) score++;
  if (/[^A-Za-z\d]/.test(password) || password.length >= 12) score++;
  if (score === 1) return { level: 1, label: 'Слабый' };
  if (score === 2) return { level: 2, label: 'Средний' };
  if (score >= 3) return { level: 3, label: 'Сильный' };
  return { level: 0, label: '' };
}

const LEVEL_CLASS = ['', 'weak', 'medium', 'strong'] as const;

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const { level, label } = calculateStrength(password);

  return (
    <div className="password-strength">
      <div className="strength-bar">
        <div
          className={`strength-fill ${level > 0 ? LEVEL_CLASS[level] : ''}`}
          style={{ width: level === 0 ? '0%' : undefined }}
          aria-hidden="true"
        />
      </div>
      {label && (
        <span className={`strength-text ${LEVEL_CLASS[level]}`} aria-live="polite">
          {label}
        </span>
      )}
    </div>
  );
}
