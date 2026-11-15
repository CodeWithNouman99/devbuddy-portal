// Small wrapper around fetch for talking to our API.
// credentials: 'include' tells the browser to send the httpOnly auth cookie.
// We never touch the token in JavaScript; the browser handles it.

export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Is it running?', 0);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.message || 'Something went wrong. Please try again.', res.status, data.errors);
  }
  return data;
}

export class ApiError extends Error {
  constructor(message, status, errors) {
    super(message);
    this.status = status;
    // Validation errors as { fieldName: "message" } (first message per field),
    // so forms can show each error under its own input.
    this.fields = null;
    if (Array.isArray(errors) && errors.length > 0) {
      this.fields = {};
      for (const e of errors) {
        if (!this.fields[e.field]) this.fields[e.field] = e.message;
      }
    }
  }
}
