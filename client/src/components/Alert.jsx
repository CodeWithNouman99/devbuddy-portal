// The warning/error box used across pages (same style as the login page error).
export default function Alert({ children }) {
  if (!children) return null;
  return (
    <div role="alert" className="rounded-lg bg-warn-bg px-4 py-3 text-sm text-warn-text">
      {children}
    </div>
  );
}
