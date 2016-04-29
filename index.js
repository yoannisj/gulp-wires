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

// Todo: Handle errors
// Todo: Throw Warnings if options.debug is set to true
// Todo: implement 'filename' option
// - accept 'kebab-case' and 'camel-case' keywords
// - accept a function receiving the task name and returning the file name
// Todo: Implement a 'data' method to share data through task functions
// Todo: If config is given as filepath, use config's base path as default 'build' path
// ¿ Todo: move options to config ?
// ¿ Todo: rename 'files.src' to 'files.main' ?
// ¿ Todo: rename 'dir.src' to 'dir.base' ?

var wires = {};

// =Gutil
// ------
// Shortcuts to gulp-util functionality

wires.util = gutil;
wires.env = gutil.env;

// =Singleton Class & Config
// -------------------------
// Exports a function that returns a unique _instance
// of the helper class (singleton/pseudo static class)

var _isSetup = false,
  _latestConfig,
  _getFilename,
  _getKeyname,
  _defaults = {

    // make basic modules available in config's lodash templates
    imports: {
      '_': _,
      'path': path,
      'env': wires.env
    },

    tasksPath: './tasks',
    optionsPath: './options',

    filename: 'kebab-case',

    debug: wires.env.debug,

    monkeyPatch: true,

    loadTasks: true,

    loadPlugins: {
      debug: '<%= debug %>'
    },

    root: {
      src: './src',
      dest: './dest'
    },

    tasks: {}

  };

// =main
// - injects default options
// - loads configuration and tasks
// - optionally monkey-patches gulp methods
// - returns static `wires` API object
// @param config => path to configuration file or configuration hash

module.exports = function(config) {
  // if called first time, set up configuration
  if (!_isSetup || (config && _latestConfig != config)) {
    _isSetup = true;

    // load configuration
    wires.loadConfig(config, wires.options.imports);

    // load plugins
    wires.plugins = loadPlugins(wires.options.loadPlugins);

    // monkey path gulp methods
    if (wires.config.monkeyPath) {
      monkeyPathGulp();
    }

    // load tasks
    if (wires.config.loadTasks) {
      wires.loadTasks();
    }
  }

  // return static helper object
  return wires;
};

// =loadConfig
// - loads a config file or hash
// @param config => path to config file or hash of config options
// @param imports => variables/modules that are available in the config's lodash templates
//    - keys are variable names, values are values/functions

wires.loadConfig = function(config) {
  // default config filepath
  if (!config) config = './build/config.js';

  // store reference to latest config that was loaded.
  // This way, running loadConfig() with the same argument
  // twice in a row won't do the job twice
  _latestConfig = config;

  // allow passing a filepath as config
  if (typeof config == 'string') {
    config = require(path.join(process.cwd(), config));
  }

  // if resulting config is not an object
  if (typeof config !== 'object' || Array.isArray(config)) {
    // throw error: 'config must be an object, or a path to a node module that exports an object.'
    _throw(9, 'argument `config` must be a path to a config module, or a hash of configuration settings.');
  }

  // inject default configuration options
  config = _.merge(_defaults, config);

  // get default buildPath
  if (!config.buildPath)
  {
    // get config path's dirname
    if (typeof _latestConfig == 'string') {
      config.buildPath = path.dirname(_latestConfig);
    }

    // or default to process's cwd
    else {
      config.buildPath = process.cwd();
    }
  }

  // make sure buildPath is an absolute path
  if (!path.isAbsolute(config.buildPath)) {
    config.buildPath = path.join(process.cwd(), config.buildPath);
  }

  // get filename transform function
  var filenameTransform = _getTransformFunction(config.filename);
  if (!fileNameTransform) {
    _throw(9, '`filename` setting must be either "kebab-case", "camel-case", "snake-case" or a function.');
  }

  // get keyname transform function
  var keynameTransform = _getTransformFunction(config.keyname);
  if (!keynameTransform) {
    _throw(9, '`keyname` setting must be either "kebab-case", "camel-case", "snake-case" or a function.');
  }

  // expand and store configuration object
  wires.config = expander.interface(config, {
    imports: config.imports
  })();

  // chaining
  return wires;
};

// =_getTransformFunction
// - helper to get the correct string transformation function for keynames/filenames
//  @param transform => the transform setting (either, 'kebab-case', 'camel-case' or a function)

function _getTransformFunction(transform) {
  // allow the 'kebab-case' keyword
  if (transform == 'kebab-case') {
    return _.kebabCase;
  }

  // allow the 'camel-case' keyword
  if (transform == 'camel-case') {
    return _.camelCase;
  }

  if (transform == 'snake-case') {
    return _.snakeCase;
  }

  // allow setting transform as a function
  if (typeof transform == 'function') {
    return transform;
  }

  return undefined;
}

// =Log
// ----
// helper functions to log notices/warnings/errors to the CLI

var _logColors = {
  'notice': 'white',
  'warning': 'yellow',
  'error': 'red'
};

// =_log
// - logs a message to the command-line using 'gutil.log'
//    and applies to correct color for the log message type
// @param type => the type of message to log (either 'notice' or 'warning' or 'error')

function _log(type) {
  var color = _logColors[type],
    colorize = gutil.colors[color],
    // prefix message with 'Wires'
    segments = [colorize('[Wires]')];

  // get warning segments and format them
  for (var i = 1, ln = arguments.length; i < ln; i++) {
    segments.push(colorize(arguments[i]));
  }

  // add 'Wires:' in front of warning
  gutil.log.apply(gutil, segments);
}

// =_warn
// - logs a warning message in the console
// @param messages.. => list of messages to log in the warning

function _warn(message) {
  _log('warning', message);
}

// =_warn
// - throws an error in the console and exits the current process
// @param code => exit code to use to exit the process
// @param messages => error message to log in the console

function _throw(code, message) {
  _log('error', message);
  process.exit(code);
}

// =Module-Loading Helpers
// -----------------------
// helper functions to load and cache task/options files

var _cache = {
  options: {},
  tasks: {}
};

// =_load
// - loads a file given a path and basepath (defaults to config.buildPath);
// @param filePath => path to the file to load
// @param base => [optional] the context to use for 'require'

function _load( filePath, base ) {
  // load absolute paths normally
  if (path.isAbsolute(filePath)) return require(filePath);

  // load path relatively to context setting
  return require( path.join(base || wires.config.buildPath, filePath) );
}

// =_getPath
// - returns the path for files of a given type
// @param type => either 'task' or 'options'
// @param name => the name of the 'task' or 'plugin' to get the function or options for
// @param filename => the name of the file defining the task function or plugin options

function _getPath(type, name, filename) {
  // get basePath
  var basePath;

  switch (type) {
  case 'task':
    basePath = wires.config.tasksPath;
    break;
  case 'options':
    basePath = wires.config.optionsPath;
    break;
  }

  // get complete file path
  var filePath = path.join( basePath, filename || _getFilename(name) );

  // add file extension
  return _.endsWith(filePath, '.js') ? filePath : filePath + '.js';
}

// =_exists
// - checks whether a given task/options file exists
// @param type => either 'task' or 'options'
// @param name => the name of the 'task' or 'plugin' for which to load config/options
// @param filename => the name of the file exporting the task function or the options

function _exists(type, name, filename ) {
  // cached files/modules exist
  if (_cache[type].hasOwnProperty(name)) return true;

  // search for module's file
  var filePath = _getPath(type, name, filename),
    file = globule.find(filePath, {
      cwd: wires.config.context
    });

  // return whether file was found or not
  return !!(file.length);
}

// =_get
// returns the value exported in a given task/options file
// @param type => either 'task' or 'options'
// @param name => the name of the 'task' or 'plugin' for which to load config/options
// @param filename => the file exporting the wanted value

function _get( type, name, filename) {
  // return cached module
  if (_cache[type][name]) return _cache[type][name];

  else if (!_exists(type, name, filename)) {
    // Todo: throw warning if options.debug = true
    //  OR throw an error (not interesting as a feature to fail silently..)
    return undefined;
  }

  // load file
  var res = _load( _getPath(type, name, filename) );

  // cache and return result
  _cache[type][name] = res;
  return res;
}

// =Tasks
// ------
// load and register tasks from separate files

// =hasTask
// - returns whether a given task exists or not
// @param name => the name of the task to check for
// @param filename => the name of the file exporting the task function

wires.hasTask = function( name, filename ) {
  return _exists('task', name, filename);
};

// =getTask
// - returns a given task's function as defined in task file
// @param name => the name of the task to retreive
// @param filename => the name of the file exporting the task function

wires.getTask = function(name, filename) {
  return _get('task', name, filename);
};

// =loadTask
// - loads a given task by registering it using `gulp.task`.
// @param name => the name of the task to load
// @param deps => array of task-names to run before
// @param filename => name of file exporting the task function

wires.loadTask = function(name, deps, filename) {
  // get task configuration
  var conf = wires.getTaskConfig(name);

  // allow omitting the 'deps' argument
  if (!Array.isArray(deps)) {

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

  // automate watching files and run task on changes
  // PROBLEM: reference other task's watch/src files..
  // TODO: make this possible in task configuration
  if (wires.env.watch) {
    gulp.watch(wires.watchGlob(name), name);
  }
};

// =loadTasks
// - loads a set of tasks by registering it using `gulp.task`
// @param tasks => an array of task names to load, or `true` to load all tasks

wires.loadTasks = function(tasks) {
  // load all tasks found in the task folder by default
  // or when 'true' is passed
  if (!tasks || tasks === true) {
    // get absolute path to tasks directory
    var tasksDir = path.isAbsolute(tasksPath) ? tasksPath :
      path.join(wires.config.buildPath, tasksPath);

    // set 'tasks' to an array of task filenames
    // TODO: allow sub-tasks in sub-folders
    // => need to replace _.camelCase and _.kebabCase so '/' is mapped to ':'
    tasks = globule.find('*.js', {
      cwd: tasksDir
    }).map(function(file) {
      return _getKeyname( path.basename(file) );
    });
  }

  // allow passing an array of task names
  if (Array.isArray(tasks))
  {
    tasks.forEach(function(task) {
      wires.loadTask(task);
    });
  }

  // allow passing an object of tasks
  else if (typeof tasks == 'object')
  {
    for (var task in tasks)
    {
      // allow mapping a task to a hash with filename and dependencies
      if (typeof tasks[task] == 'object') {
        wires.loadTask(task, tasks[task].deps, tasks[task].filename);
      }
      // or a dependencies array, or a filename
      else {
        wires.loadTask(task, tasks[task]);
      }
    }
  }
};

// =Task Configuration
// -------------------

var _taskConfigs = {};

// =getTaskConfig
// - loads task configuration hash, normalizes it and populates with defaults
// @param task => name of task fot witch to retreive configuration

wires.getTaskConfig = function(task) {

  // get task options from global configuration
  var conf = wires.config.tasks[task];

  // throw warning in debug mode if no options are defined and task file does not exist
  if (wires.options.debug && !conf && !wires.hasTask(task)) {
    _warn('getTaskConfig(): could not find the task "' + task + '".');
  }

  // get cached task configurations
  if (_taskConfigs.hasOwnProperty(task)) return _taskConfigs[task];

  // inject option defaults
  conf = _.assign({
    root: {
      src: wires.config.paths.src,
      dest: wires.config.paths.dest
    },
    dir: {
      src: './',
      dest: './'
    },
    files: {
      src: '**/*',
      watch: '**/*'
    }
  }, wires.config.tasks[task] || {});

  // split `root` option into 'src' and 'dest' targets
  if (typeof conf.root == 'string') {
    conf.root = {
      src: conf.root,
      dest: conf.root
    };
  }

  // split `dir` option into 'src' and 'dest' targets
  if (typeof conf.dir == 'string') {
    conf.dir = {
      src: conf.dir,
      dest: conf.dir
    };
  }

  // split `files` option into 'src' and 'watch' targets
  // - accept array of globs as value for files
  if (typeof conf.files == 'string' || Array.isArray(conf.files)) {
    conf.files = {
      src: conf.files,
      watch: conf.files
    };
  }

  // cache task configuration and return it
  _taskConfigs[task] = conf;
  return conf;
};

// =Plugins
// --------

// =hasOptions
// - verifies if options are set for a given plugin
// @param name => the name of the plugin for which to check the options
// @param filename => the name of the file exporting the plugin options

wires.hasOptions = function(name, filename) {
  return _exists('options', name, filename);
};

// =getOptions
// - returns options for a given plugin as defined in options' file
// @param name => the name of the plugin for which to retreive the options
// @param filename => the name of the file exporting the plugin options to retreive

wires.getOptions = function(name, filename) {
  // default to an empty object
  return _get('options', name, filename) || {};
};

// =plugin
// - runs a given plugin with default options and returns the result
// @param name => name of the plugin to run
// @param options => [optional] options to pass to the plugin instead of defaults
//    - can be a hash of options which will be merged into the defaults
//    - or the name of a file exporting alternative options

wires.plugin = function(name, options) {
  // use default options if none passed
  // or load options from file if filename is passed
  if (options === undefined || typeof options == 'string') {
    options = wires.getOptions(name, options);
  }

  // merge options into defaults
  else if (typeof options == 'object') {
    options = _.assign(wires.getOptions(name), options);
  }

  // invoke plugin and return result
  return plugins[name](options);
};

// =Paths
// ------
// get paths from task configuration objects

var _paths = {};

// =path
// - returns path to a task's base/dest directory
// @param task => name of task for wich to return path
// @param target => which path to retreive (either 'src'/'base'/'watch' or 'dest')

wires.path = function( task, target ) {
  // throw error if target argument is missing
  if (target === undefined) _throw(9, 'called `wires.path` without the `target` argument.');

  // map 'base' and 'watch' targets to 'src' dirs
  if (target == 'base' || target == 'watch') target = 'src';

  // namespace for task and target
  var ns = task + '_' + target;

  // return cached directories
  if (_paths.hasOwnProperty(ns)) return _paths[ns];

  // return 'undefined' for unexisting tasks
  if (!wires.hasTask(task)) {
    _warn('wires.path(): could not find the task "' + task + '".');
    return undefined;
  }

  // get config options (with defaults for missing options)
  var conf = wires.getTaskConfig(task);

  // resolve directory path
  var dirPath = path.join(conf.root[target], conf.dir[target]);

  // cache and return directory path
  _paths[ns] = dirPath;
  return dirPath;
};

// =base
// - returns the path to the task's src directory
// @param task => name of task for wich to return src path

wires.base = function( task ) {
  return wires.path(task, 'base');
};

// =dest
// - returns the path to the task's dest directory
// @param task => name of task for wich to return dest path

wires.dest = function( task ) {
  return wires.path(task, 'dest');
};

// =Globs
// ------

// =_negateGlob
// - negates a glob or array of globs
// @param glob => glob to negate

function _negateGlob(glob) {
  // allow arrays of globs
  if (Array.isArray(glob)) {
    return _.map(glob, function(pattern) {
      return _negateGlob(pattern);
    });
  }

  return '!' + _.trimStart(glob, './!');
};

var _globs = {};

// =_glob(glob, target, _base, _negate)
// - dynamically build a glob, recognizes task names to include or ignore task files
// @param glob = the glob or array of globs to parse
// @param target = the task files to target, either 'src'/'main' or 'watch'
// @param _base [internal] = whether to prepend the glob with a base path or not
// @param _negate [internal] = wether to negate the glob or not

function _glob(glob, target, _base, _negate) {
  // make sure the 'target' argument was passed
  if (target === undefined) _throw(9, 'called `wires.glob` without the `target` argument.');

  // map the 'main' target to 'src' files
  if (target == 'main') target = 'src';

  // allow array of globs and/or task-names
  if (Array.isArray(glob)) {
    // apply to all items in the array glob
    // - flatten because some task names might be aliased to nested array globs
    var globs = _.flatMap(glob, function(pattern) {
      return _glob(pattern, target, _base, _negate);
    });

    // remove task names that aliased to undefined
    globs = _.without(globs, undefined);

    // return undefined if all task names resolved to undefined
    return globs.length ? globs : undefined;
  }

  // detect task-names and negated task-names
  var isNegated = (glob.substr(0, 1) == '!'),
    pattern = isNegated ? glob.substr(1) : glob,
    isTask = (!isGlob(pattern) && wires.hasTask(pattern));

  if (isTask) {
    var task = pattern,
      ns = task + '_' + target;

    // separate namespace for negated task-names
    if (isNegated) ns = ns + '_not';

    // return cached task glob
    if (_globs.hasOwnProperty(ns)) return _globs[ns];

    var taskConf = wires.getTaskConfig(task),
      base = wires.path(task, 'base');

    // console.log(task, 'config', taskConf);

    // could be an array, should not have any task-names
    glob = _glob(taskConf.files[target], target, base, isNegated);

    // cache task glob
    _globs[ns] = glob;
    return glob;
  }

  if (!isGlob(glob)) {
    return undefined;
  }

  // join base
  if (_base) glob = globjoin(_base, glob);

  // negate
  if (_negate) glob = _negateGlob(glob);

  return glob;
}

// =glob(glob, target)
// - builds a glob by replacing task-names with globs corresponding to config
// @param glob = the glob or array of globs to parse
// @param target = the task files to target, either 'src'/'main' or 'watch'

wires.glob = function(glob, target) {
  return _glob(glob, target);
};

// =srcGlob(glob)
// - builds a glob by replacing task-names with globs for their main files
// @param glob = the glob or array of globs to parse

wires.mainGlob = function(glob) {
  return wires.glob(glob, 'src');
};

// =watchGlob(glob)
// - builds a glob by replacing task-names with globs for their watch files
// @param glob = the glob or array of globs to parse

wires.watchGlob = function(glob) {
  return wires.glob(glob, 'watch');
};

// =Files
// ------

var _files = {};

// =files
// get files corresponding to given glob
// - detects task-names and replaces them with glob correspondig to config
// @param glob = the glob or array of globs to parse
// @param target = [optional] the task files to target, either 'src'/'main' or 'watch'

wires.files = function(glob, target) {
  // default to 'src' target (useful in case only arbitrary globs are passed)
  if (target === undefined) target = 'src';

  // parse glob to detect and replace task-names
  glob = wires.glob(glob, target);

  // return an array of files that correspond to the glob
  return globule.find(glob);
};

// =mainFiles
// get main files corresponding to given glob
// - detects task-names and replaces them with glob for their main files
// @param glob = the glob or array of globs to parse

wires.mainFiles = function( task ) {
  return wires.files(task, 'src');
};

// =watchFiles
// get main files corresponding to given glob
// - detects task-names and replaces them with glob for their watch files
// @param glob = the glob or array of globs to parse

wires.watchFiles = function( task ) {
  return wires.files(task, 'watch');
};

// =Gulp
// -----
// monkey patch gulp methods

function monkeyPath() {
  // store reference to original gulp methods
  var _gulpAPI = {
    task: gulp.task,
    src: gulp.src,
    watch: gulp.watch,
    dest: gulp.dest
  };

  // =gulp.task
  gulp.task = function(name, deps, fn) {
    // allow omitting the 'deps' argument
    if (!Array.isArray(deps)) {
      fn = deps;
      deps = [];
    }

    // load function from task file if no task function is provided
    // or if a filename is provided instead
    if (!fn || typeof fn == 'string') {
      fn = wires.getTask(name, fn);
    }

    // delegate to original `gulp.task` method
    return _gulpAPI.task(name, deps, fn );
  };

  // =gulp.src
  gulp.src = function(globs, options) {
    // use '_instance.src' to replace task names with globs in config
    globs = _instance.src(files);

    return _gulpAPI.src.call(files, globs, options);
  };

  // =gulp.watch
  gulp.watch = function(globs, options, handlers) {
    // use 'wires.watch' to replace task names with globs in config
    globs = _instance.watch(files);

    return _gulpAPI.watch.apply(gulp, globs, options, handlers);
  };

  // =gulp.dest
  gulp.dest = function(dir, options) {
    // use 'wires.dest' to replace task names with path in config
    dir = _instance.dest(dir, options);

    return _gulpAPI.dest.apply(gulp, dir);
  };
}