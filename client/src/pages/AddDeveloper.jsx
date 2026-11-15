// /developers/new: form on the left, WhatsApp welcome preview on the right.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api } from '../api.js';
import Alert from '../components/Alert.jsx';
import { DEV_ROLES, todayInputValue } from '../lib/format.js';
import { cleanWhatsappNumber } from '../lib/phone.js';

const inputClass =
  'mt-1.5 w-full rounded-lg border border-line bg-card px-3.5 py-2.5 text-ink outline-none placeholder:text-muted/60 focus:border-primary focus:ring-2 focus:ring-primary/20';

export default function AddDeveloper() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', whatsappNumber: '', role: '', joinDate: todayInputValue(), manager: '' });
  const [managers, setManagers] = useState([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api('/users/managers')
      .then((data) => setManagers(data.managers))
      .catch(() => setError('Could not load the list of managers.'));
  }, []);

  function update(field) {
    return (e) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      setFieldErrors((errs) => ({ ...errs, [field]: undefined })); // clear that field's error while typing
    };
  }

  const cleanedNumber = cleanWhatsappNumber(form.whatsappNumber);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setSubmitting(true);
    try {
      const data = await api('/developers', { method: 'POST', body: form });
      // The detail page shows the warning if the WhatsApp welcome failed.
      navigate(`/developers/${data.developer._id}`, { state: { warning: data.warning } });
    } catch (err) {
      if (err.status === 409) {
        setFieldErrors({ whatsappNumber: err.message });
      } else if (err.fields) {
        setFieldErrors(err.fields);
      } else {
        setError(err.message);
      }
      setSubmitting(false);
    }
  }

  const firstName = form.name.trim().split(/\s+/)[0] || 'there';

  return (
    <div className="mx-auto max-w-6xl">
      <Link to="/developers" className="text-sm text-muted hover:text-ink">
        Back to developers
      </Link>
      <h1 className="mt-2 text-3xl">Add developer</h1>
      <p className="mt-1 text-sm text-muted">They'll get a WhatsApp welcome from DevBuddy and start Day 1.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-5 rounded-card border border-line bg-card p-6 md:p-8">
          <Alert>{error}</Alert>

          <Field label="Full name" htmlFor="name" error={fieldErrors.name}>
            <input id="name" value={form.name} onChange={update('name')} placeholder="e.g. Fatima Noor" className={inputClass} />
          </Field>

          <Field label="WhatsApp number" htmlFor="whatsappNumber" error={fieldErrors.whatsappNumber}>
            <input
              id="whatsappNumber"
              type="tel"
              inputMode="tel"
              value={form.whatsappNumber}
              onChange={update('whatsappNumber')}
              placeholder="0300 1234567"
              className={inputClass}
            />
            <p className="mt-1.5 text-xs text-muted">
              {cleanedNumber ? `Will be saved as ${cleanedNumber}` : 'Will be saved as 92XXXXXXXXXX'}
            </p>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Role" htmlFor="role" error={fieldErrors.role}>
              <select id="role" value={form.role} onChange={update('role')} className={inputClass}>
                <option value="">Choose a role</option>
                {DEV_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </Field>

            <Field label="Join date" htmlFor="joinDate" error={fieldErrors.joinDate}>
              <input id="joinDate" type="date" value={form.joinDate} onChange={update('joinDate')} className={inputClass} />
            </Field>
          </div>

          <Field label="Manager" htmlFor="manager" error={fieldErrors.manager}>
            <select id="manager" value={form.manager} onChange={update('manager')} className={inputClass}>
              <option value="">No manager yet</option>
              {managers.map((m) => (
                <option key={m._id} value={m._id}>{m.name}</option>
              ))}
            </select>
          </Field>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-page hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Add developer'}
          </button>
        </form>

        {/* WhatsApp-style preview */}
        <aside>
          <p className="mb-2 text-sm font-medium text-muted">Welcome message preview</p>
          <div className="overflow-hidden rounded-card border border-line">
            <div className="flex items-center gap-3 bg-primary px-4 py-3 text-page">
              <span className="grid size-9 place-items-center rounded-full bg-page/15 font-serif text-sm font-semibold">DB</span>
              <div>
                <p className="text-sm font-medium">DevBuddy</p>
                <p className="text-xs text-page/70">Onboarding assistant</p>
              </div>
            </div>
            <div className="min-h-64 bg-seg-upcoming p-4">
              <div className="max-w-[90%] rounded-lg rounded-tl-none bg-card px-3.5 py-2.5 text-sm leading-relaxed">
                <p>Hi {firstName}, welcome to the team!</p>
                <p className="mt-2">
                  I'm DevBuddy, your onboarding guide for the next 7 days. Each morning I'll send you that day's task.
                </p>
                <p className="mt-2">
                  <span className="font-medium">Day 1:</span> Read company overview.
                </p>
                <p className="mt-2">Have a question? Just reply to this chat anytime.</p>
                <p className="mt-1 text-right text-[11px] text-muted">09:00</p>
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted">The actual message is sent by the n8n workflow and may differ slightly.</p>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, htmlFor, error, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {error && <p className="mt-1.5 text-sm text-warn-text">{error}</p>}
    </div>
  );
}
