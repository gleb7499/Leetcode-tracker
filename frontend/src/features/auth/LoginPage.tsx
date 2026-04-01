import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { ForgotPasswordModal } from '../../components/ForgotPasswordModal/ForgotPasswordModal';
import { useAuth } from '../../shared/hooks/useAuth';

type Tab = 'login' | 'register';

export function LoginPage() {
  const [activeTab, setActiveTab] = useState<Tab>('login');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const { login, register, isProcessing, currentUser } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, redirect to app
  if (currentUser) {
    navigate('/', { replace: true });
    return null;
  }

  const handleLogin = async (email: string, password: string, remember: boolean) => {
    const result = await login(email, password, remember);
    if (result.success) {
      setTimeout(() => navigate('/', { replace: true }), 1000);
    }
    return result;
  };

  const handleRegister = async (name: string, email: string, password: string) => {
    const result = await register(name, email, password);
    if (result.success) {
      setTimeout(() => navigate('/', { replace: true }), 1000);
    }
    return result;
  };

  return (
    <div className="auth-body">
      <main className="auth-container" role="main">
        <header className="auth-header">
          <div className="auth-logo" aria-hidden="true">
            🧠
          </div>
          <h1 className="auth-title">LeetCode Tracker</h1>
          <p className="auth-subtitle">Система интервального повторения для алгоритмов</p>
        </header>

        <div
          className="auth-tabs"
          role="tablist"
          aria-label="Вкладки авторизации"
        >
          <button
            type="button"
            id="login-tab"
            className={`auth-tab${activeTab === 'login' ? ' active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'login'}
            aria-controls="login-panel"
            onClick={() => setActiveTab('login')}
          >
            Вход
          </button>
          <button
            type="button"
            id="register-tab"
            className={`auth-tab${activeTab === 'register' ? ' active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'register'}
            aria-controls="register-panel"
            onClick={() => setActiveTab('register')}
          >
            Регистрация
          </button>
        </div>

        <div
          id="login-panel"
          className={`auth-panel${activeTab === 'login' ? ' active' : ''}`}
          role="tabpanel"
          aria-labelledby="login-tab"
          hidden={activeTab !== 'login'}
        >
          <LoginForm
            onLogin={handleLogin}
            onForgotPassword={() => setShowForgotModal(true)}
            isProcessing={isProcessing && activeTab === 'login'}
          />
        </div>

        <div
          id="register-panel"
          className={`auth-panel${activeTab === 'register' ? ' active' : ''}`}
          role="tabpanel"
          aria-labelledby="register-tab"
          hidden={activeTab !== 'register'}
        >
          <RegisterForm
            onRegister={handleRegister}
            isProcessing={isProcessing && activeTab === 'register'}
          />
        </div>

        <footer className="auth-footer">
          <p>🔒 Ваши данные хранятся локально в браузере</p>
        </footer>
      </main>

      {showForgotModal && (
        <ForgotPasswordModal onClose={() => setShowForgotModal(false)} />
      )}
    </div>
  );
}
