// "Managers see only their own developers", as reusable MongoDB filters.
const Developer = require('../models/Developer');

// Filter for the Developer collection.
function developerScope(user) {
  return user.role === 'manager' ? { manager: user._id } : {};
}

// Filter for collections that point at a developer (Question, Progress).
// Admin/HR: {} (everything). Manager: only their developers' rows.
async function developerRefScope(user) {
  if (user.role !== 'manager') return {};
  const ids = await Developer.find(developerScope(user)).distinct('_id');
  return { developer: { $in: ids } };
}

module.exports = { developerScope, developerRefScope };
