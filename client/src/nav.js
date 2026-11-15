// The sidebar links and which roles may use each one.
// App.jsx uses the same roles to protect the pages themselves, so hiding a
// link is not the only protection (the server checks roles too).
export const NAV_ITEMS = [
  { to: '/overview', label: 'Overview', roles: ['admin', 'hr', 'manager'] },
  { to: '/developers', label: 'Developers', roles: ['admin', 'hr', 'manager'] },
  { to: '/developers/new', label: 'Add developer', roles: ['admin', 'hr'] },
  { to: '/knowledge-gaps', label: 'Knowledge gaps', roles: ['admin', 'manager'] },
  { to: '/team', label: 'Team & roles', roles: ['admin'] },
  { to: '/audit', label: 'Audit log', roles: ['admin'] },
];

export function rolesFor(path) {
  return NAV_ITEMS.find((item) => item.to === path)?.roles;
}
