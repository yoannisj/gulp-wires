var path = require('path');
// cached task functions
var tasks = {};

module.exports = function(config) {

  return function(name, filename) {
    // default to same filename as provided task name
    filename = filename || name;

    // return task from cache if requested before
    if (tasks.hasOwnProperty(name)) {
      return tasks[name];
    }

    // load task from file
    var filepath = path.join(config.paths.tasks, filename),
      fn = require(filepath);

    // cache and return the task function
    tasks[name] = fn;
    return fn;
  };

};