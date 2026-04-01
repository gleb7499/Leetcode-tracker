interface AppHeaderProps {
  userName: string;
  onLogout: () => void;
}

export function AppHeader({ userName, onLogout }: AppHeaderProps) {
  return (
    <header className="app-header" role="banner">
      <div className="header-content">
        <div className="header-brand">
          <span className="header-logo" aria-hidden="true">
            🧠
          </span>
          <h1 className="header-title">LeetCode Tracker</h1>
        </div>
        <div className="header-user">
          <span className="user-greeting" id="user-greeting">
            Привет, {userName}!
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-small"
            id="logout-btn"
            onClick={onLogout}
            aria-label="Выйти из системы"
          >
            Выйти
          </button>
        </div>
      </div>
    </header>
  );
}
