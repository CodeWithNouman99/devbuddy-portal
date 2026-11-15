// One place to import every model from: const { User, Task } = require('../models');
module.exports = {
  User: require('./User'),
  Developer: require('./Developer'),
  Task: require('./Task'),
  Progress: require('./Progress'),
  Question: require('./Question'),
  AuditLog: require('./AuditLog'),
};
