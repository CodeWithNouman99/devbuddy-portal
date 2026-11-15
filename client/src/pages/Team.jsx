// /team (admin only): staff list with role and last sign-in, an "Invite
// member" form, and per-user role change / deactivate. Every change is
// written to the audit log by the server.
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Alert from '../components/Alert.jsx';
import { ROLE_LABELS, formatDateTime } from '../lib/format.js';
import { cleanWhatsappNumber } from '../lib/phone.js';

const ROLES = ['admin', 'hr', 'manager'];

const ROLE_PILL = {
  admin: 'bg-primary text-page',
  hr: 'bg-seg-upcoming text-ink',
  manager: 'bg-ok-bg text-primary',
};

const inputClass =
  'mt-1.5 w-full rounded-lg border border-line bg-card px-3.5 py-2.5 text-ink outline-none placeholder:text-muted/60 focus:border-primary focus:ring-2 focus:ring-primary/20';

const EMPTY_FORM = { name: '', email: '', role: '', managerPhone: '', password: '' };

export default function Team() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null); // user row being updated

  function load() {
    return api('/users')
      .then((data) => setUsers(data.users))
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
  }, []);

  async function update(user, changes) {
    setError('');
    setSavingId(user._id);
    try {
      const data = await api(`/users/${user._id}`, { method: 'PATCH', body: changes });
      setUsers((list) => list.map((u) => (u._id === user._id ? data.user : u)));
    } catch (err) {
      setError(err.message);
    }
    setSavingId(null);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-3xl">Team & roles</h1>
      <p className="mt-1 text-sm text-muted">Who can sign in to DevBuddy, and what they can do.</p>

      <div className="mt-4">
        <Alert>{error}</Alert>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Users table */}
        <div className="overflow-x-auto rounded-card border border-line bg-card self-start">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Member</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Last sign-in</th>
                <th className="px-5 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => {
                const isSelf = u._id === me._id;
                const inactive = u.active === false;
                const saving = savingId === u._id;
                return (
                  <tr key={u._id} className={`border-b border-line last:border-b-0 ${inactive ? 'text-muted' : ''}`}>
                    <td className="px-5 py-3.5">
                      <p className="flex items-center gap-2 font-medium">
                        {u.name}
                        {isSelf && <span className="text-xs font-normal text-muted">(you)</span>}
                        {inactive && (
                          <span className="rounded-full border border-line bg-page px-2 py-px text-[11px] font-medium text-muted">
                            Deactivated
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted">
                        {u.email}
                        {u.managerPhone ? ` · +${u.managerPhone}` : ''}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      {isSelf ? (
                        <RolePill role={u.role} />
                      ) : (
                        <select
                          aria-label={`Role for ${u.name}`}
                          value={u.role}
                          disabled={saving}
                          onChange={(e) => update(u, { role: e.target.value })}
                          className={`rounded-full border-0 px-2.5 py-0.5 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/30 ${ROLE_PILL[u.role]}`}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-muted">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never'}</td>
                    <td className="px-5 py-3.5 text-right">
                      {!isSelf && (
                        <button
                          onClick={() => update(u, { active: inactive })}
                          disabled={saving}
                          className="whitespace-nowrap rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink hover:bg-page disabled:opacity-50"
                        >
                          {saving ? 'Saving…' : inactive ? 'Reactivate' : 'Deactivate'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!users && !error && <p className="px-5 py-12 text-center text-sm text-muted">Loading team…</p>}
        </div>

        <InviteForm onCreated={(user) => setUsers((list) => [...(list || []), user].sort((a, b) => a.name.localeCompare(b.name)))} />
      </div>
    </div>
  );
}

function RolePill({ role }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_PILL[role]}`}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}

function InviteForm({ onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function change(field) {
    return (e) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      setFieldErrors((errs) => ({ ...errs, [field]: undefined }));
      setSuccess('');
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setSuccess('');
    setSubmitting(true);
    try {
      const body = { ...form };
      if (body.role !== 'manager') delete body.managerPhone; // only managers have one
      const data = await api('/users', { method: 'POST', body });
      onCreated(data.user);
      setSuccess(`${data.user.name} can now sign in with the temporary password.`);
      setForm(EMPTY_FORM);
    } catch (err) {
      if (err.status === 409) setFieldErrors({ email: err.message });
      else if (err.fields) setFieldErrors(err.fields);
      else setError(err.message);
    }
    setSubmitting(false);
  }

  const cleanedPhone = cleanWhatsappNumber(form.managerPhone);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 self-start rounded-card border border-line bg-card p-6">
      <h2 className="text-xl">Invite member</h2>
      <Alert>{error}</Alert>
      {success && <p className="rounded-lg bg-ok-bg px-4 py-3 text-sm text-primary">{success}</p>}

      <Field label="Full name" htmlFor="inv-name" error={fieldErrors.name}>
        <input id="inv-name" value={form.name} onChange={change('name')} className={inputClass} />
      </Field>
      <Field label="Work email" htmlFor="inv-email" error={fieldErrors.email}>
        <input id="inv-email" type="email" value={form.email} onChange={change('email')} className={inputClass} />
      </Field>
      <Field label="Role" htmlFor="inv-role" error={fieldErrors.role}>
        <select id="inv-role" value={form.role} onChange={change('role')} className={inputClass}>
          <option value="">Choose a role</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
      </Field>

      {form.role === 'manager' && (
        <Field label="Manager WhatsApp (optional)" htmlFor="inv-phone" error={fieldErrors.managerPhone}>
          <input
            id="inv-phone"
            type="tel"
            inputMode="tel"
            value={form.managerPhone}
            onChange={change('managerPhone')}
            placeholder="0300 1234567"
            className={inputClass}
          />
          <p className="mt-1.5 text-xs text-muted">
            For stuck alerts and the weekly report.{cleanedPhone ? ` Saved as ${cleanedPhone}.` : ''}
          </p>
        </Field>
      )}

      <Field label="Temporary password" htmlFor="inv-password" error={fieldErrors.password}>
        <input
          id="inv-password"
          type="text"
          autoComplete="off"
          value={form.password}
          onChange={change('password')}
          className={inputClass}
        />
        <p className="mt-1.5 text-xs text-muted">At least 10 characters. Share it with them privately.</p>
      </Field>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-page hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? 'Inviting…' : 'Invite member'}
      </button>
    </form>
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
