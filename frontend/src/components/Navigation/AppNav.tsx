import type { Screen } from '../../shared/types';

interface AppNavProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

const NAV_ITEMS: { screen: Screen; label: string; icon: string }[] = [
  { screen: 'home', label: 'Главная', icon: '🏠' },
  { screen: 'add', label: 'Добавить', icon: '➕' },
  { screen: 'stats', label: 'Статистика', icon: '📊' },
  { screen: 'settings', label: 'Настройки', icon: '⚙️' },
];

export function AppNav({ currentScreen, onNavigate }: AppNavProps) {
  return (
    <nav className="app-nav" role="navigation" aria-label="Основная навигация">
      <div className="nav-content">
        {NAV_ITEMS.map(({ screen, label, icon }) => (
          <button
            key={screen}
            type="button"
            className={`nav-button${currentScreen === screen ? ' active' : ''}`}
            data-screen={screen}
            onClick={() => onNavigate(screen)}
            aria-current={currentScreen === screen ? 'page' : undefined}
            aria-label={label}
          >
            <span className="nav-icon" aria-hidden="true">
              {icon}
            </span>
            <span className="nav-label">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
