export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="skeleton" style={{ height: 32, width: "40%", marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 16, width: "60%", marginBottom: 32 }} />
      <div className="skeleton" style={{ height: 88, marginBottom: 24 }} />
      <div className="skeleton" style={{ height: 220 }} />
    </div>
  );
}
