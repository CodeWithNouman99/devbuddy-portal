import { useState } from "react";

const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL;

const ROLES = ["Frontend", "Backend", "Full Stack", "QA", "DevOps"];

const FIELDS = [
  "name",
  "whatsapp_number",
  "role",
  "join_date",
  "manager_whatsapp",
];

const emptyForm = {
  name: "",
  whatsapp_number: "",
  role: "",
  join_date: "",
  manager_whatsapp: "",
};

const isPhone = (v) => /^\d{10,15}$/.test(v);

const iso = (d) => d.toISOString().slice(0, 10);

const shiftYears = (n) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + n);
  return iso(d);
};

const MIN_DATE = shiftYears(-1);
const MAX_DATE = shiftYears(1);

function validate(form) {
  const errors = {};

  const name = form.name.trim();
  if (!name) errors.name = "Enter the developer's full name.";
  else if (name.length < 2)
    errors.name = "The name must be at least 2 letters.";
  else if (!/^\p{L}[\p{L} .'-]*$/u.test(name))
    errors.name = "Use letters only in the name.";

  if (!form.whatsapp_number)
    errors.whatsapp_number = "Enter the WhatsApp number.";
  else if (!isPhone(form.whatsapp_number))
    errors.whatsapp_number =
      "Enter 10 to 15 digits, including the country code.";

  if (!form.role) errors.role = "Select a role.";

  if (!form.join_date) errors.join_date = "Select the join date.";
  else if (form.join_date < MIN_DATE || form.join_date > MAX_DATE)
    errors.join_date = "Pick a date within one year of today.";

  if (!form.manager_whatsapp)
    errors.manager_whatsapp = "Enter the manager's WhatsApp number.";
  else if (!isPhone(form.manager_whatsapp))
    errors.manager_whatsapp =
      "Enter 10 to 15 digits, including the country code.";

  return errors;
}

function Field({ label, hint, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-600">
        {label}
      </label>
      <div className="field">{children}</div>
      {error ? (
        <p role="alert" className="mt-1.5 text-sm font-medium text-black">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-neutral-500">{hint}</p>
      )}
    </div>
  );
}

export default function App() {
  const [form, setForm] = useState(emptyForm);
  const [touched, setTouched] = useState({});
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const errors = validate(form);

  const showError = (n) => touched[n] && errors[n];

  const inputClass = (n) =>
    `w-full rounded-none bg-transparent py-3 text-lg text-black outline-none ${
      showError(n) ? "border-b-2 border-black" : "border-b border-neutral-300"
    }`;

  const handleChange = (e) => {
    const { name, value } = e.target;
    const clean = name.includes("whatsapp") ? value.replace(/\D/g, "") : value;
    setForm({ ...form, [name]: clean });
  };

  const handleBlur = (e) => setTouched({ ...touched, [e.target.name]: true });

  const sameNumber =
    isPhone(form.whatsapp_number) &&
    form.whatsapp_number === form.manager_whatsapp;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sending) return;

    if (Object.keys(errors).length > 0) {
      setTouched(Object.fromEntries(FIELDS.map((f) => [f, true])));
      return;
    }

    if (!WEBHOOK_URL) {
      setError(
        "The webhook URL is missing. Add VITE_WEBHOOK_URL to the .env file and restart the app.",
      );
      return;
    }

    setSending(true);
    setError("");

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          name: form.name.trim().replace(/\s+/g, " "),
        }),
      });
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
      setSent(true);
    } catch (err) {
      setError(
        `The developer was not added. ${err.message}. Check your connection and try again.`,
      );
    } finally {
      setSending(false);
    }
  };

  const addAnother = () => {
    setForm(emptyForm);
    setTouched({});
    setSent(false);
    setError("");
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="flex items-baseline justify-between px-6 pt-8 sm:px-12">
        <p className="font-display text-xl font-extrabold tracking-tight">
          DevBuddy
        </p>
        <a
          href="#/dashboard"
          className="text-sm font-medium underline underline-offset-4"
        >
          Manager dashboard
        </a>
      </header>

      <main className="mx-auto w-full max-w-md px-6 pb-20 pt-16">
        {sent ? (
          <div className="pt-6">
            <svg
              className="tick"
              viewBox="0 0 24 24"
              width="56"
              height="56"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 12l5 5L20 6" />
            </svg>
            <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight">
              {form.name.trim()} has been added.
            </h1>
            <p className="mt-3 text-neutral-600">
              DevBuddy is sending the Day 1 welcome on WhatsApp.
            </p>
            <button
              type="button"
              onClick={addAnother}
              className="mt-10 border-2 border-black px-6 py-3 font-semibold transition-colors duration-200 hover:bg-black hover:text-white"
            >
              Add another developer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <h1 className="font-display text-4xl font-extrabold tracking-tight">
              Add a developer
            </h1>

            <div className="mt-12 space-y-9">
              <Field label="Full name" error={showError("name")}>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="off"
                  disabled={sending}
                  className={inputClass("name")}
                />
              </Field>

              <Field
                label="Developer WhatsApp number"
                hint="Include the country code. Digits only."
                error={showError("whatsapp_number")}
              >
                <input
                  name="whatsapp_number"
                  value={form.whatsapp_number}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  inputMode="numeric"
                  autoComplete="off"
                  disabled={sending}
                  className={inputClass("whatsapp_number")}
                />
              </Field>

              <Field label="Role" error={showError("role")}>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={sending}
                  className={`${inputClass("role")} cursor-pointer ${
                    form.role ? "text-black" : "text-neutral-400"
                  }`}
                >
                  <option value="" disabled>
                    Select a role
                  </option>
                  {ROLES.map((r) => (
                    <option key={r} value={r} className="text-black">
                      {r}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Join date" error={showError("join_date")}>
                <input
                  type="date"
                  name="join_date"
                  value={form.join_date}
                  min={MIN_DATE}
                  max={MAX_DATE}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={sending}
                  className={inputClass("join_date")}
                />
              </Field>

              <Field
                label="Manager WhatsApp number"
                hint={
                  sameNumber
                    ? "This is the same number as the developer's."
                    : undefined
                }
                error={showError("manager_whatsapp")}
              >
                <input
                  name="manager_whatsapp"
                  value={form.manager_whatsapp}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  inputMode="numeric"
                  autoComplete="off"
                  disabled={sending}
                  className={inputClass("manager_whatsapp")}
                />
              </Field>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-8 border-l-4 border-black bg-neutral-100 px-4 py-3 text-sm"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={sending}
              className="group relative mt-10 w-full overflow-hidden border-2 border-black bg-black py-4 font-display text-lg font-extrabold text-white transition-colors duration-300 enabled:hover:text-black disabled:cursor-wait disabled:opacity-60"
            >
              <span className="absolute inset-0 origin-left scale-x-0 bg-white transition-transform duration-300 group-enabled:group-hover:scale-x-100" />
              <span className="relative">
                {sending ? "Adding developer..." : "Add developer"}
              </span>
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
