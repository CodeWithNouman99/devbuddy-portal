import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Where to go after login: the page they tried to open, or /overview.
  const redirectTo = location.state?.from || '/overview';

  // Already signed in? Skip the login page.
  if (!loading && user) {
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Enter your work email and password.');
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password, rememberMe);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message); // the server's message, e.g. "Invalid email or password."
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left: brand panel */}
      <section className="bg-primary text-page flex flex-col justify-between p-8 md:p-14">
        <p className="font-serif text-2xl font-semibold">DevBuddy</p>

        <div className="my-12 md:my-0 max-w-md">
          <h1 className="text-4xl md:text-5xl leading-tight">A calmer first week for every new developer.</h1>
          <p className="mt-5 text-base leading-relaxed text-page/80">
            Plan onboarding, follow each developer's daily progress and answer their questions, all in one place.
          </p>
        </div>

        <p className="hidden md:block text-sm text-page/60">For HR, Managers and Admins.</p>
      </section>

      {/* Right: sign-in form */}
      <section className="flex items-center justify-center p-6 md:p-14">
        <div className="w-full max-w-sm">
          <h2 className="text-3xl">Sign in</h2>
          <p className="mt-2 text-sm text-muted">Use your work account to continue.</p>

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
            {error && (
              <div role="alert" className="rounded-lg bg-warn-bg px-4 py-3 text-sm text-warn-text">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium">
                Work email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="mt-1.5 w-full rounded-lg border border-line bg-card px-3.5 py-2.5 text-ink outline-none placeholder:text-muted/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-line bg-card px-3.5 py-2.5 text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <label className="flex items-center gap-2.5 text-sm text-muted select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="size-4 accent-primary"
              />
              Keep me signed in
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-page transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>

            <p className="text-xs leading-relaxed text-muted">
              For security, 5 failed attempts lock the account for 15 minutes.
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}
