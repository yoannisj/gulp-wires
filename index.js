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

// =Wires
// ------
// Module definition

var wires = module.exports = function( config, imports ) {
  // allow passing a filepath as config argument
  if (typeof config == 'string') config = require(config);

  // parse configuration object and register config
  this.setConfig(config, imports);
};

// =Gutil
// ------
// Shortcuts to gulp-util functionality

wires.util = gutil;
wires.env = gutil.env;

// =Setup
// ------

wires.setup = function(config, tasks) {
  // set  configuration
  this.loadConfig(config);

  // optionally load tasks
  if (tasks) this.loadTasks(tasks);
};

// =Config
// -------
// load configuration options and inject defaults

// =loadConfig
wires.loadConfig = function(config, imports) {

  // default path to config file
  if (!config) config = './build/config.js';

  // allow passing a path to a config file
  if (typeof config == 'string') {
    config = require(config)(env);
  }

  // if resulting config is not an object
  if (typeof config !== object || Array.isArray(config)) {
    // throw error: 'config must be an object, or a path to a node module that exports a function.'
  }

  // make modules available inside the config object's templates
  // - inject default modules
  imports = assign({
    _: _,
    path: path
  }, imports || {});

  // inject default configuration options
  config = _.merge({

    paths: {
      build: './build',
      tasks: '<%= paths.build %>/tasks',
      options: '<%= paths.build %>/options',
      src: './src',
      dest: './dest'
    },

    tasks: {}

  }, config);

  // expand and store configuration object
  this.config = expander.interface(config)();

  return this.config;
};

// =Load
// -----
// load and cache files

var _cache = {
  options: {},
  tasks: {}
};

wires._getPath = function(type, name, filename) {
  return path.join( this.config.root[type], filename || _.kebabCase(name) );
};

// =_exists
// - checks whether a given task/options file exists
wires._exists = function(type, name, filename ) {
  // cached files/modules exist
  if (_cache[type].hasOwnProperty(name)) return true;

  // search for module's file
  var filePath = wires._getPath(type, name, filename),
    file = globule.find(filePath, { cwd: __dirname });

  // if file exists
  if (file.length) {
    // cache name for future calls to '_exists'
    _cache[name] = null;
    return true;
  }

  return false;
};

// =_get
// returns the value exported in a given task/options file
wires._get = function( type, name, filename) {
  // return cached module
  if (_cache[type][name]) {
    return _cache[type][name];
  }

  else if (!wires._exists(type, name, filename)) {
    return undefined;
  }

  // load file
  var res = require( wires_filePath(type, name, filename));

  // cache and return result
  _cache[type][name] = res;
  return res;
};

// =Tasks
// ------
// load tasks from separate files

// =hasTask
// - returns whether a given task exists or not
wires.hasTask = function( name, filename ) {
  return wires._exists('tasks', name, filename);
};

// =getTask
// - returns a given task's function as defined in task file
wires.getTask = function(name, filename) {
  return wires._get('tasks', name, filename);
};

// =loadTasks
// - loads a set of tasks by registering it using `gulp.task`
wires.loadTasks = function(tasks) {
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
wires.loadTask = function(name, deps, filename) {
  // allow omitting the 'deps' argument
  if (!Array.isArray(deps)) {
    var conf = this.config.tasks[name];
    fn = deps;
    deps = conf && conf.deps ? conf.deps : [];
  }

  // load function from task file if no task function is provided
  // or if a filename is provided instead
  if (!fn || typeof fn == 'string') {
    fn = wires.getTask(name, fn);
  }

  // register task through gulp
  gulp.task(name, deps, fn);
};

// =Plugins
// --------

// =hasOptions
// - veifies if options are set for a given plugin
wires.hasOptions = function(name, filename) {
  return wires._exists('options', name, filename);
};

// =loadOptions
// - returns options for a given plugin as defined in options' file
wires.getOptions = function(name, filename) {
  // default to an empty object
  return wires._get('options', name, filename) || {};
};

// =plugin
// - runs a given plugin with default options and returns the result
wires.plugin = function(name, options) {
  // use default options if none passed
  // or load options from file if filename is passed
  if (options === undefined || typeof options == 'string') {
    options = wire.getOptions();
  }

  // invoke plugin and return result
  return plugins[name](options);
};

// =Paths and Globs
// ----------------
// get paths and globs from task configuration objects

var _dirs = {},
  _files = {};

// =dir
// - returns path to a task's base/dest directory
wires.dir = function( task, target ) {
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
wires.base = function( task ) {
  return wires.dir(task, 'base');
};

// =dest
wires.dest = function( task ) {
  return wires.dir(task, 'dest');
};

// =files
// - returns glob for a taks's src/watch files
wires.files = function(task, target) {
  // namespace for task and target
  var ns = task + '_' + target;

  // returned cached file paths
  if (_files.hasOwnProperty(ns)) return _files[ns];

  // get config options and defaults if missing
  var conf = this.config.tasks[task] || {},
    dir = wires.dir(task, 'src'),
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

// TODO: merge `wires._glob` with `wires.files`

// =_glob( target, glob )
// - aliases task-names in a glob to corresponding globs in task's config
wires._glob = function(target, glob) {
  // allow array globs
  if (Array.isArray(glob)) {
    // apply to all items in the array glob
    // - flatten because some task names might be aliased to nested array globs
    globs = _.flatMap(glob, function(pattern) {
      return wires.files(pattern);
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
  if (wires.hasTask(glob)) {
    return wires.files(glob, target);
  }

  // if neither glob nor existing task name
  return undefined;
};

// cfg.tasks['my-task'].src = '**/*.js'
// cfg.tasks['my-other-task'].src = '**/*.coffee'
// wires._glob('src', 'my-task'); => (see cfg || undefined)
// wires._glob('src', ['my-task', '!**/*.spec.js']); => (see cfg || '!**/*.spec.js')
// wires._glob('src', ['my-task', 'my-other-task']); => (see cfg || undefined)
// wires._glob('src', '**/*.js'); => '**/*.js'
// wires._glob('src', ['**/*.js', '!**/*.spec.js']); => ['**/*.js', '!**/*.spec.js']

// =src
wires.src = function( patterns ) {
  return wires._glob('src', patterns);
};

// =watch
wires.watch = function( task ) {
  return wires._glob('watch', patterns);
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
gulp.task = function(name, deps, fn) {
  // allow omitting the 'deps' argument
  if (!Array.isArray(deps)) {
    var conf = this.config.tasks[task];
    fn = deps;
    deps = conf && conf.deps ? conf.deps : [];
  }

  // load function from task file if no task function is provided
  // or if a filename is provided instead
  if (!fn || typeof fn == 'string') {
    fn = wires.getTask(name, fn);
  }

  // delegate to original `gulp.task` method
  return _original.task(name, deps, fn );
};

// =gulp.src
gulp.src = function() {
  return _original.src.apply(gulp, arguments);
};

// =gulp.watch
gulp.watch = function() {
  return _original.watch.apply(gulp, arguments);
};

// =gulp.dest
gulp.dest = function() {
  return _original.dest.apply(gulp, arguments);
};