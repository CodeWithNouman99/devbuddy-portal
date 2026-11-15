// Runs after express-validator rules. If any rule failed, stop here and
// send a 400 with the first error message; otherwise continue to the route.
const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const errors = result.array();
    return res.status(400).json({
      message: errors[0].msg,
      errors: errors.map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

module.exports = validate;
