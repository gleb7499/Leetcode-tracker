export function SettingsPage() {
  return (
    <section id="settings-screen" className="screen active" aria-labelledby="settings-title">
      <div className="screen-header">
        <h2 id="settings-title" className="screen-title">
          Настройки
        </h2>
      </div>
      <div className="placeholder-content">
        <div className="placeholder-icon" aria-hidden="true">
          ⚙️
        </div>
        <h3>Настройки в разработке</h3>
        <p>Здесь будут доступны настройки приложения.</p>
      </div>
    </section>
  );
}
