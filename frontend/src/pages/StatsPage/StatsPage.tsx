export function StatsPage() {
  return (
    <section id="stats-screen" className="screen active" aria-labelledby="stats-title">
      <div className="screen-header">
        <h2 id="stats-title" className="screen-title">
          Статистика
        </h2>
      </div>
      <div className="placeholder-content">
        <div className="placeholder-icon" aria-hidden="true">
          📊
        </div>
        <h3>Статистика в разработке</h3>
        <p>Здесь будет отображаться ваша статистика прогресса.</p>
      </div>
    </section>
  );
}
