import { useCallback, useEffect, useState } from "react";

const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL;
const KEY_STORE = "devbuddy_dashboard_key";

function Stat({ label, value, dark }) {
  return (
    <div
      className={`p-5 ${
        dark ? "bg-black text-white" : "border border-neutral-300 bg-white"
      }`}
    >
      <p className="font-display text-5xl font-extrabold tracking-tight">
        {value}
      </p>
      <p
        className={`mt-1 text-sm ${
          dark ? "text-neutral-400" : "text-neutral-500"
        }`}
      >
        {label}
      </p>
    </div>
  );
}

function statusText(d) {
  if (d.state === "completed") return "Completed";
  if (d.state === "stuck")
    return `Stuck on ${d.pending_task} for ${d.stuck_days} days`;
  return d.pending_task ? `On track, working on ${d.pending_task}` : "On track";
}

function DeveloperRow({ d }) {
  const stuck = d.state === "stuck";
  return (
    <li
      className={`flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between ${
        stuck ? "bg-black text-white" : "border-b border-neutral-200"
      }`}
    >
      <div className="sm:w-1/3">
        <p className="font-display text-xl font-extrabold tracking-tight">
          {d.name}
        </p>
        <p
          className={`text-sm ${stuck ? "text-neutral-400" : "text-neutral-500"}`}
        >
          {d.role}
        </p>
      </div>

      <div className="sm:w-1/3">
        <div className="flex gap-1" aria-hidden="true">
          {Array.from({ length: d.total_tasks }).map((_, i) => (
            <span
              key={i}
              className={`h-2 flex-1 ${
                i < d.tasks_done
                  ? stuck
                    ? "bg-white"
                    : "bg-black"
                  : stuck
                    ? "bg-white/25"
                    : "bg-neutral-200"
              }`}
            />
          ))}
        </div>
        <p
          className={`mt-2 text-sm ${stuck ? "text-neutral-300" : "text-neutral-600"}`}
        >
          Day {d.current_day} of {d.total_tasks}, {d.tasks_done} of{" "}
          {d.total_tasks} tasks done
        </p>
      </div>

      <div className="sm:w-1/3 sm:text-right">
        <p className="font-semibold">{statusText(d)}</p>
        <p
          className={`text-sm ${stuck ? "text-neutral-400" : "text-neutral-500"}`}
        >
          {d.questions} questions, {d.not_in_docs} not in docs
        </p>
      </div>
    </li>
  );
}

export default function Dashboard() {
  const [key, setKey] = useState(() => sessionStorage.getItem(KEY_STORE) || "");
  const [input, setInput] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const rejectKey = useCallback(() => {
    sessionStorage.removeItem(KEY_STORE);
    setKey("");
    setData(null);
    setError("That access key is not correct.");
  }, []);

  const load = useCallback(
    async (k) => {
      if (!DASHBOARD_URL) {
        setError(
          "The dashboard URL is missing. Add VITE_DASHBOARD_URL to the .env file and restart the app.",
        );
        return;
      }
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `${DASHBOARD_URL}?key=${encodeURIComponent(k)}`,
        );
        if (res.status === 401) return rejectKey();
        if (!res.ok)
          throw new Error(`Request failed with status ${res.status}`);
        const json = await res.json();
        if (json.error) return rejectKey();
        sessionStorage.setItem(KEY_STORE, k);
        setKey(k);
        setData(json);
      } catch (err) {
        setError(`Could not load the dashboard. ${err.message}`);
      } finally {
        setLoading(false);
      }
    },
    [rejectKey],
  );

  useEffect(() => {
    if (key) load(key);
    // Load once on page open if a key is already saved for this session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unlock = (e) => {
    e.preventDefault();
    const k = input.trim();
    if (!k) return;
    setInput("");
    load(k);
  };

  const lock = () => {
    sessionStorage.removeItem(KEY_STORE);
    setKey("");
    setData(null);
    setError("");
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="flex items-baseline justify-between px-6 pt-8 sm:px-12">
        <p className="font-display text-xl font-extrabold tracking-tight">
          DevBuddy
        </p>
        <div className="flex items-baseline gap-6">
          <a
            href="#/"
            className="text-sm font-medium underline underline-offset-4"
          >
            Add a developer
          </a>
          {data && (
            <button
              type="button"
              onClick={lock}
              className="text-sm font-medium underline underline-offset-4"
            >
              Lock
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 pb-20 pt-14 sm:px-12">
        {!data ? (
          <form onSubmit={unlock} className="max-w-md">
            <h1 className="font-display text-4xl font-extrabold tracking-tight">
              Manager dashboard
            </h1>
            <p className="mt-3 text-neutral-600">
              Enter the access key to see how your new developers are doing.
            </p>

            <label className="mt-10 block text-sm font-medium text-neutral-600">
              Access key
            </label>
            <div className="field">
              <input
                type="password"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoComplete="off"
                disabled={loading}
                className="w-full rounded-none border-b border-neutral-300 bg-transparent py-3 text-lg text-black outline-none"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="mt-6 border-l-4 border-black bg-neutral-100 px-4 py-3 text-sm"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="group relative mt-8 w-full overflow-hidden border-2 border-black bg-black py-4 font-display text-lg font-extrabold text-white transition-colors duration-300 enabled:hover:text-black disabled:cursor-not-allowed disabled:border-neutral-200 disabled:bg-neutral-200 disabled:text-neutral-400"
            >
              <span className="absolute inset-0 origin-left scale-x-0 bg-white transition-transform duration-300 group-enabled:group-hover:scale-x-100" />
              <span className="relative">
                {loading ? "Opening..." : "Open dashboard"}
              </span>
            </button>
          </form>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="font-display text-4xl font-extrabold tracking-tight">
                  Your developers
                </h1>
                <p className="mt-2 text-sm text-neutral-500">
                  Updated {new Date(data.generated_at).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => load(key)}
                disabled={loading}
                className="border-2 border-black px-5 py-2 text-sm font-semibold transition-colors duration-200 hover:bg-black hover:text-white disabled:opacity-50"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-6 border-l-4 border-black bg-neutral-100 px-4 py-3 text-sm"
              >
                {error}
              </p>
            )}

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Stat label="Developers" value={data.summary.total} />
              <Stat label="Active" value={data.summary.active} />
              <Stat label="Completed" value={data.summary.completed} />
              <Stat
                label="Stuck"
                value={data.summary.stuck}
                dark={data.summary.stuck > 0}
              />
              <Stat label="Questions asked" value={data.summary.questions} />
              <Stat label="Not in docs" value={data.summary.not_in_docs} />
            </div>

            {data.developers.length === 0 ? (
              <p className="mt-12 text-neutral-500">
                No developers yet. Add one from the HR portal.
              </p>
            ) : (
              <ul className="mt-10 border-t border-neutral-200">
                {data.developers.map((d) => (
                  <DeveloperRow key={d.dev_id} d={d} />
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}
