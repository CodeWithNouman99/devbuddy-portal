// Talks to the n8n automation. Only the server calls n8n, so the webhook URL
// and secret never reach the browser.
const { n8nNewDeveloperWebhook, n8nWebhookSecret } = require('../config/env');

const TIMEOUT_MS = 10 * 1000; // don't let a slow n8n hang the request forever

// Tells n8n "a new developer was added" so it can send the WhatsApp welcome.
// Never throws: returns { ok: true } or { ok: false, error: "..." }.
async function notifyNewDeveloper(developer, manager) {
  if (!n8nNewDeveloperWebhook) {
    const error = 'N8N_NEW_DEVELOPER_WEBHOOK is not set';
    console.warn(`n8n webhook skipped: ${error}`);
    return { ok: false, error };
  }

  const payload = {
    dev_id: developer._id.toString(),
    name: developer.name,
    whatsapp_number: developer.whatsappNumber,
    role: developer.role,
    join_date: developer.joinDate.toISOString().slice(0, 10), // "2026-11-14"
    manager_whatsapp: manager?.managerPhone || null,
  };

  try {
    const res = await fetch(n8nNewDeveloperWebhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-devbuddy-secret': n8nWebhookSecret,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      throw new Error(`n8n responded with HTTP ${res.status}`);
    }
    return { ok: true };
  } catch (err) {
    console.error('n8n new-developer webhook failed:', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = { notifyNewDeveloper };
