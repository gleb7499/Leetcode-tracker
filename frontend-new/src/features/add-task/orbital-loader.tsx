export function OrbitalLoader() {
  return (
    <div
      className="orbital-loader"
      role="status"
      aria-live="polite"
      aria-label="Resolving LeetCode task"
    >
      <span className="orbital-loader__ring orbital-loader__ring--outer" />
      <span className="orbital-loader__ring orbital-loader__ring--inner" />
    </div>
  )
}
