// Central error handling. Any error thrown in a route ends up here.
// The full error is logged on the server, but the browser only ever sees a
// short safe message, never a stack trace or database details.

// For unknown URLs like /api/does-not-exist
function notFound(req, res) {
  res.status(404).json({ message: 'Not found.' });
}

// Express recognises an error handler by its 4 arguments.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // The request body was not valid JSON (thrown by express.json)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Request body is not valid JSON.' });
  }

  console.error(err);

  // Errors created on purpose with a status below 500 (e.g. bad JSON body
  // from express.json) are safe to show. Everything else gets a generic message.
  const status = err.status || err.statusCode || 500;
  const isClientError = status >= 400 && status < 500;

  res.status(status).json({
    message: isClientError && err.expose !== false ? err.message : 'Something went wrong. Please try again.',
  });
}

module.exports = { notFound, errorHandler };
