'use-strict';

// require dependencies
// --------------------

// node modules
var path = require('path');
var stripPath = require('strip-path');
var _ = require('lodash');
var expander = require('expander');
var globule = require('globule');
var arrayify = require('array-ify');
var isGlob = require('is-glob');
var globjoin = require('globjoin');

// gulp
var gulp = require('gulp');
var gutil = require('gulp-util');
var loadPlugins = require('gulp-load-plugins');

// =Singleton Class
// ----------------
// Exports a function that returns a unique instance
// of the helper class (singleton/pseudo static class)

var instance;

// exported function to get instance
module.exports = function(config, options) {
  // make sure wires is setup once only
  if (!instance) {
    instance = new Wires(config, options);
  }

  return instance;
};

// Constructor
var Wires = function(config, options) {
  // inject default options
  this.options = _.merge({}, {
    debug: false,
    imports: {
      _: _,
      path: path
    },
    loadPlugins: {}
  }, options || {});

  // options shared with 'gulp-load-plugins'
  if (this.options.loadPlugins.debug === undefined) {
    this.options.loadPlugins.debug = this.options.debug;
  }

  // set  configuration
  this.loadConfig(config, this.options.imports);

  // load plugins
  this.plugins = loadPlugins(this.options.loadPlugins);

  // return instance
  return this;
};

// =Gutil
// ------
// Shortcuts to gulp-util functionality

Wires.util = gutil;
Wires.env = gutil.env;

// =Config
// -------
// load configuration options and inject defaults

var config;

// =loadConfig
Wires.prototype.loadConfig = function(conf, imports) {

  // default config filepath
  if (!conf) conf = './build/config.js';

  // allow passing a filepath as config
  if (typeof conf == 'string') {
    conf = require(path.join(process.cwd(), conf));
  }

  // if resulting config is not an object
  if (typeof conf !== 'object' || Array.isArray(conf)) {
    // throw error: 'config must be an object, or a path to a node module that exports an object.'
  }

  // make modules available inside the config object's templates
  // - inject default modules
  imports = _.assign({
    _: _,
    path: path
  }, imports || {});

  // inject default configuration options
  conf = _.merge({

    paths: {
      build: './build',
      tasks: '<%= paths.build %>/tasks',
      options: '<%= paths.build %>/options',
      src: './src',
      dest: './dest'
    },

    tasks: {}

  }, conf);

  // expand and store configuration object
  config = this.config = expander.interface(conf, {
    imports: imports
  })();

  return config;
};

// =File-Loading Helpers
// ---------------------
// helper functions to load and cache files

var _cache = {
  options: {},
  tasks: {}
};

// =_getPath
// - returns the path for files of a given type
function _getPath(type, name, filename) {
  return path.join( config.root[type], filename || _.kebabCase(name) );
}

// =_exists
// - checks whether a given task/options file exists
function _exists(type, name, filename ) {
  // cached files/modules exist
  if (_cache[type].hasOwnProperty(name)) return true;

  // search for module's file
  var filePath = _getPath(type, name, filename),
    file = globule.find(filePath, { cwd: __dirname });

  // if file exists
  if (file.length) {
    // cache name for future calls to '_exists'
    _cache[name] = null;
    return true;
  }

  return false;
}

// =_get
// returns the value exported in a given task/options file
function _get( type, name, filename) {
  // return cached module
  if (_cache[type][name]) {
    return _cache[type][name];
  }

  else if (!_exists(type, name, filename)) {
    return undefined;
  }

  // load file
  var res = require( wires_filePath(type, name, filename));

  // cache and return result
  _cache[type][name] = res;
  return res;
}

// =Tasks
// ------
// load tasks from separate files

// =hasTask
// - returns whether a given task exists or not
Wires.prototype.hasTask = function( name, filename ) {
  return _exists('tasks', name, filename);
};

// =getTask
// - returns a given task's function as defined in task file
Wires.prototype.getTask = function(name, filename) {
  return _get('tasks', name, filename);
};

// =loadTasks
// - loads a set of tasks by registering it using `gulp.task`
Wires.prototype.loadTasks = function(tasks) {
  // load all tasks found in the task folder by default
  // or when 'true' is passed
  if (!tasks || tasks === true) {
    // set 'tasks' to an array of task filenames
    tasks = globule.find(this.config.root.tasks, {
      cwd: __dirname
    }).map(function(file) {
      return path.basename(file);
    });
  }

  // allow passing an array of task names
  if (Array.isArray(tasks))
  {
    tasks.forEach(function(task) {
      this.loadTask(task);
    });
  }

  // allow passing an object of tasks
  else if (typeof tasks == 'object')
  {
    for (var task in tasks)
    {
      // allow mapping a task to a hash with filename and dependencies
      if (typeof tasks[task] == 'object') {
        this.loadTask(task, tasks[task].deps, tasks[task].filename);
      }
      // or a dependenciess array, or a filename
      else {
        this.loadTask(task, tasks[task]);
      }
    }
  }
};

// =loadTask
// - loads a given task by registering it using `gulp.task`.
Wires.prototype.loadTask = function(name, deps, filename) {
  // allow omitting the 'deps' argument
  if (!Array.isArray(deps)) {
    var conf = this.config.tasks[name];
    fn = deps;
    deps = conf && conf.deps ? conf.deps : [];
  }

  // load function from task file if no task function is provided
  // or if a filename is provided instead
  if (!fn || typeof fn == 'string') {
    fn = this.getTask(name, fn);
  }

  // register task through gulp
  gulp.task(name, deps, fn);
};

// =Plugins
// --------

// =hasOptions
// - veifies if options are set for a given plugin
Wires.prototype.hasOptions = function(name, filename) {
  return _exists('options', name, filename);
};

// =loadOptions
// - returns options for a given plugin as defined in options' file
Wires.prototype.getOptions = function(name, filename) {
  // default to an empty object
  return _get('options', name, filename) || {};
};

// =plugin
// - runs a given plugin with default options and returns the result
Wires.prototype.plugin = function(name, options) {
  // use default options if none passed
  // or load options from file if filename is passed
  if (options === undefined || typeof options == 'string') {
    options = wire.getOptions();
  }

  // invoke plugin and return result
  return plugins[name](options);
};

// =Globs helper
// -------------

// =_glob( target, glob )
// - aliases task-names in a glob to corresponding globs in task's config
_glob = function(target, glob) {
  // allow array globs
  if (Array.isArray(glob)) {
    // apply to all items in the array glob
    // - flatten because some task names might be aliased to nested array globs
    globs = _.flatMap(glob, function(pattern) {
      return this.files(pattern);
    });

    // remove task names that aliased to undefined
    globs = _.without(globs, undefined);

    // return undefined if all task names resolved to undefined
    return globs.length ? globs : undefined;
  }

  // leave plain globs intact
  if (isGlob(glob)) {
    return glob;
  }

  // alias to task path for existing tasks
  if (this.hasTask(glob)) {
    return this.files(glob, target);
  }

  // if neither glob nor existing task name
  return undefined;
};

// =Paths
// ------
// get paths from task configuration objects

var _dirs = {},
  _files = {};

// =dir
// - returns path to a task's base/dest directory
Wires.prototype.dir = function( task, target ) {
  // map 'base' and 'watch' targets to 'src' dirs
  if (target == 'base' || target == 'watch') target = 'src';

  // namespace for task and target
  var ns = task + '_' + target;

  // return cached directories
  if (_dirs.hasOwnProperty(ns)) return _dirs[ns];

  // get config options or defaults if missing
  var conf = this.config.tasks[task] || {},
    root = conf.root ? conf.root[target] : this.config.root[target],
    dir = conf.dir ? conf.dir[target] : './';

  // resolve directory path
  var dirPath = path.join(root || './', dir || './');

  // cache and return directory path
  _dirs[ns] = dirPath;
  return dirPath;
};

// =base
Wires.prototype.base = function( task ) {
  return this.dir(task, 'base');
};

// =dest
Wires.prototype.dest = function( task ) {
  return this.dir(task, 'dest');
};

// =files
// - returns glob for a taks's src/watch files
Wires.prototype.files = function(task, target) {
  // namespace for task and target
  var ns = task + '_' + target;

  // returned cached file paths
  if (_files.hasOwnProperty(ns)) return _files[ns];

  // get config options and defaults if missing
  var conf = this.config.tasks[task] || {},
    dir = this.dir(task, 'src'),
    files = conf.files ? conf.files : './**/*',
    filesPath;

  // allow setting separate files pattern per target
  if (typeof files == object) files = files[target] || './**/*';

  // resolve files path (allow to set files as an array glob)
  filesPath = globjoin(dir, files);

  // cache and return files path
  _files[ns] = filesPath;
  return filesPath;
};

// TODO: merge `this._glob` with `this.files`

// cfg.tasks['my-task'].src = '**/*.js'
// cfg.tasks['my-other-task'].src = '**/*.coffee'
// _glob('src', 'my-task'); => (see cfg || undefined)
// _glob('src', ['my-task', '!**/*.spec.js']); => (see cfg || '!**/*.spec.js')
// _glob('src', ['my-task', 'my-other-task']); => (see cfg || undefined)
// _glob('src', '**/*.js'); => '**/*.js'
// _glob('src', ['**/*.js', '!**/*.spec.js']); => ['**/*.js', '!**/*.spec.js']

// =src
Wires.prototype.src = function( patterns ) {
  return _glob('src', patterns);
};

// =watch
Wires.prototype.watch = function( task ) {
  return _glob('watch', patterns);
};

// =Gulp
// -----
// monkey patch gulp methods

var _original = {
  task: gulp.task,
  src: gulp.src,
  watch: gulp.watch,
  dest: gulp.dest
};

// =gulp.task
Wires.prototype.task = function(name, deps, fn) {
  // allow omitting the 'deps' argument
  if (!Array.isArray(deps)) {
    fn = deps;
    deps = [];
  }

  // load function from task file if no task function is provided
  // or if a filename is provided instead
  if (!fn || typeof fn == 'string') {
    fn = this.getTask(name, fn);
  }

  // delegate to original `gulp.task` method
  return _original.task(name, deps, fn );
};

// =gulp.src
Wires.prototype.src = function(globs, options) {
  // use 'this.src' to replace task names with globs in config
  globs = this.src(files);

  return _original.src.call(files, globs, options);
};

// =gulp.watch
Wires.prototype.watch = function(globs, options, handlers) {
  // use 'this.watch' to replace task names with globs in config
  globs = this.watch(files);

  return _original.watch.apply(gulp, globs, options, handlers);
};

// =gulp.dest
Wires.prototype.dest = function(dir, options) {
  // use 'this.dest' to replace task names with path in config
  dir = this.dest(dir, options);

  return _original.dest.apply(gulp, dir);
};