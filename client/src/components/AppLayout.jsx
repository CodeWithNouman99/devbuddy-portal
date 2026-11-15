// Frame for every signed-in page: sidebar on the left (on top on mobile),
// page content on the right.
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import { NAV_ITEMS } from '../nav.js';
import { ROLE_LABELS } from '../lib/format.js';

// "Developers" should stay highlighted on a developer's detail page,
// but not on "Add developer", which has its own link.
function isActive(itemPath, currentPath) {
  if (itemPath === '/developers') {
    return currentPath === '/developers' || (currentPath.startsWith('/developers/') && currentPath !== '/developers/new');
  }
  return currentPath === itemPath;
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const links = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen md:flex">
      <aside className="flex flex-col border-b border-line bg-card md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r">
        <div className="px-6 pt-6 pb-4 md:pb-8">
          <Link to="/overview" className="font-serif text-2xl font-semibold text-primary">
            DevBuddy
          </Link>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible md:pb-0">
          {links.map((item) => {
            const active = isActive(item.to, pathname);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
                  active ? 'bg-primary text-page' : 'text-muted hover:bg-page hover:text-ink'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center justify-between gap-3 border-t border-line px-6 py-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted">{ROLE_LABELS[user.role] || user.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-page"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-8 md:px-10 md:py-10">
        <Outlet />
      </main>
    </div>
  );
}
