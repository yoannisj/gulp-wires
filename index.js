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
var loadPlugins = require('gulp-load-plugins');
var gutil = require('gulp-util');
var gulpif = require('gulp-if');
var debug = require('gulp-debug');
var plumber = require('gulp-plumber');

// Todo: Throw Warnings if options.debug is set to true
// Todo: Implement a 'data' method to share data through task functions
// Todo: If config is given as filepath, use config's base path as default 'build' path
// ¿ Todo: move options to config ?
// ¿ Todo: rename 'files.src' to 'files.main' ?
// ¿ Todo: rename 'dir.src' to 'dir.base' ?

var wires = {};

// =Utilities
// -----------
// Shortcuts to functionality from gulp-util and other utility plugins

// =gutil
wires.util = gutil;
wires.log = gutil.log;
wires.env = gutil.env;

// =gulpif
wires.if = gulpif;
wires.unless = function(condition, no, yes) {
  // allow omitting the 'yes' argument
  yes = yes || function() {};
  return gulpif(condition, yes, no);
}

// =gulpdebug
wires.debug = function(options) {
  // allow passing a string, used as title option
  if (typeof options == 'string') {
    options = { title: options };
  }

  return debug(options);
};

// =plumber
wires.plumber = plumber;

// =Singleton Class & Config
// -------------------------
// Exports a function that returns a unique _instance
// of the helper class (singleton/pseudo static class)

var _isSetup = false,
  _currConfig,
  _getFilename,
  _getKeyname,
  _defaults = {

    tasksPath: './tasks',
    optionsPath: './options',

    filename: 'kebab-case',

    keyname: 'kebab-case',

    debug: wires.env.debug,

    monkeyPatch: true,

    loadTasks: true,

    loadPlugins: {
      config: path.join(process.cwd(), 'package.json'),
      pattern: ['gulp-*', 'gulp.*', '!gulp-wires'],
      camelize: false,
      debug: '<%= debug %>'
    },

    plumber: {},

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
  if (!_isSetup || (config && _currConfig != config)) {
    _isSetup = true;

    // load configuration
    wires.loadConfig(config);

    // load plugins
    wires.plugins = loadPlugins(wires.config.loadPlugins);

    // monkey patch gulp methods
    if (wires.config.monkeyPatch) {
      _monkeyPatchGulp();
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
  _currConfig = config;

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
  config = _.merge({}, _defaults, config || {});

  // get default buildPath
  if (!config.buildPath)
  {
    // get config path's dirname
    if (typeof _currConfig == 'string') {
      config.buildPath = path.dirname(_currConfig);
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
  _getFilename = _getTransformFunction(config.filename);
  if (!_getFilename) {
    _throw(9, '`filename` setting must be either "kebab-case", "camel-case", "snake-case" or a function.');
  }

  // get keyname transform function
  _getKeyname = _getTransformFunction(config.keyname);
  if (!_getKeyname) {
    _throw(9, '`keyname` setting must be either "kebab-case", "camel-case", "snake-case" or a function.');
  }

  // temporarily delete 'imports' from config for expander to work correctly
  var imports = _.clone(config.imports);
  delete config.imports;

  // expand and store configuration object
  wires.config = expander.interface(config, {
    // make base modules available in config templates
    imports: _.assign({
      '_': _,
      'path': path,
      'env': wires.env
    }, imports || {})
  })();

  // restore imports setting
  wires.config.imports = imports;

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
  task: {}
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
      cwd: wires.config.buildPath
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
  if (_cache[type].hasOwnProperty(name)) return _cache[type][name];

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

// =Task Configuration
// -------------------

var _taskConfigs = {};

// =getTaskConfig
// - loads task configuration hash, normalizes it and populates with defaults
// @param task => name of task fot witch to retreive configuration

wires.getTaskConfig = function(task) {
  // throw warning in debug mode if no options are defined and task file does not exist
  if (wires.config.debug && !wires.hasTask(task)) {
    _warn('getTaskConfig(): could not find the task "' + task + '".');
  }

  // get cached task configurations
  if (_taskConfigs.hasOwnProperty(task)) return _taskConfigs[task];

  // get task options from global configuration
  var conf = wires.config.tasks[task];

  // understand "group" tasks, defined as dependency arrays
  // TODO: Test this
  if (Array.isArray(conf)) {
    // map dependencies to the 'deps' setting
    conf = {
      deps: conf
    };
  }

  // inject option defaults
  conf = _.assign({
    deps: [],
    autoWatch: true,
    root: {
      src: wires.config.root.src,
      dest: wires.config.root.dest
    },
    dir: {
      src: './',
      dest: './'
    },
    files: {
      src: '**/*',
      watch: '**/*'
    }
  }, conf || {});

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

// =Tasks
// ------
// load and register tasks from separate files

// =hasTask
// - returns whether a given task exists or not
// @param name => the name of the task to check for
// @param filename => the name of the file exporting the task function

wires.hasTask = function( name, filename ) {
  return (wires.config.tasks.hasOwnProperty(name) || _exists('task', name, filename));
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
// @param fn => [optional] task function or name of file exporting it

var _watchingTasks = {};

wires.loadTask = function(name, deps, fn) {

  // get task configuration
  var conf = wires.getTaskConfig(name);

  // allow omitting the 'deps' argument
  if (arguments.length <= 2 && !Array.isArray(deps)) {
    fn = deps;
    deps = conf.deps;
  }

  // load function from task file if no task function is provided
  // or if a filename is provided instead
  if (!fn || typeof fn == 'string') fn = wires.getTask(name, fn);

  // register group tasks without a main function to just run dependencies
  if (!fn) {
    gulp.task(name, deps);
  } else {

    // register task through gulp, and watch for file changes in '--watch' mode
    // - uses a wrapper function to automate watching
    gulp.task(name, deps, function(done) {
      // start watching for file changes in '--watch' mode
      if (wires.env.watch && !_watchingTasks[name] && conf.autoWatch) {
        gulp.watch( wires.watchGlob(name), [name] );
        _watchingTasks[name] = true;
      }

      // run task function
      return fn(done);
    });

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
    var tasksPath = path.isAbsolute(wires.config.tasksPath) ? wires.config.tasksPath :
      path.join(wires.config.buildPath, wires.config.tasksPath);

    // get all tasks defined in the 'tasks' folder
    // TODO: allow sub-tasks in sub-folders
    // => need to replace _.camelCase and _.kebabCase so '/' is mapped to ':'
    var fileTasks = globule.find('*.js', {
      cwd: tasksPath
    }).map(function(file) {
      return _getKeyname( path.basename(file, path.extname(file)) );
    });

    // get all tasks defined in the global configuration
    var configTasks = _.keys(wires.config.tasks);

    // get complete list of tasks
    tasks = _.union(configTasks, fileTasks);
  }

  // allow passing an array of task names
  if (Array.isArray(tasks))
  {
    tasks.forEach(function(task) {
      wires.loadTask(task);
    });
  }

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

// =options
// - returns options for a given plugin as defined in options' file
// @param name => the name of the plugin for which to retreive the options
// @param filename => the name of the file exporting the plugin options to retreive
// @param overrides => [optional] option overrides to merge into defaults

wires.options = function(name, filename, overrides) {
  // allow omitting the 'filename' argument
  if (typeof filename == 'object') {
    overrides = filename;
    filename = name;
  }

  // load defaults from file, default to an empty object
  var options = _get('options', name, filename) || {};

  // override default options from file
  if (typeof overrides == 'object') {
    _.assign(options, overrides);
  }

  return options;
};

// =plugin
// - runs a given plugin with default options and returns the result
// @param name => name of the plugin to run
// @param filename => the name of the file exporting the plugin options to retreive
// @param overrides => [optional] option overrides to merge into defaults

wires.plugin = function(name, filename, overrides) {
  // allow passing 'false' instead of filename to use options passed on the fly
  if (filename === false) {
    options = overrides;
  }
  
  // or, load plugin options from options file
  else {
    options = wires.options(name, filename, overrides);
  }

  // invoke plugin and return result
  return wires.plugins[name](options);
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

  // remove lead from relative globs
  glob = _.trimStart(glob, './');

  // negate glob
  return _.startsWith(glob, '!') ? glob.substr(1) : '!' + glob;
}

var _globs = {};

// =_glob(glob, target, _base, _negate)
// - dynamically build a glob, recognizes task names to include or ignore task files
// @param glob = the glob or array of globs to parse
// @param options [optional] = options to customize computed glob
//  - options.target - the task files to target, either 'src'/'main' or 'watch',
//  - options.base - base path to prepend (defaults to task's base path for task names)
// @param _negate [internal] = whether to negate the glob or not

function _glob(glob, options, _taskBase, _taskNegate) {
  // allow passing target instead of options
  if (typeof options == 'string') {
    options = { target: options };
  }

  // inject default options
  options = _.assign({}, options || {});

  // swap 'main' target to 'src'
  if (options.target == 'main') options.target = 'src';

  // allow array of globs and/or task-names
  if (Array.isArray(glob)) {
    // apply to all items in the array glob
    // - flatten because some task names might be aliased to nested array globs
    var globs = _.flatMap(glob, function(pattern) {
      return _glob(pattern, options, _taskBase, _taskNegate);
    });

    // remove task names that aliased to undefined
    globs = _.without(globs, undefined);

    // return undefined if all task names resolved to undefined
    return globs.length ? globs : undefined;
  }

  // detect task-names in glob
  var isNegated = _.startsWith(glob, '!'),
    pattern = isNegated ? glob.substr(1) : glob,
    isTask = (!isGlob(pattern) && wires.hasTask(pattern));

  // swap task names with their globs
  if (isTask) {
    var task = pattern,
      // different caching ns for negated task-names
      ns = isNegated ? task + '_not' : task;

     // return cached task globs
    if (_globs.hasOwnProperty(ns) && _.isEqual(_globs[ns].options)) {
      return _globs[ns].value;
    }

    // compute task files' glob
    var taskConf = wires.getTaskConfig(task),
      taskGlobs = taskConf.files;

    glob = options.target ? taskGlobs[options.target] :
      _.flatten(_.union( [taskGlobs.src], [taskGlobs.watch] ));
    _taskBase = wires.path(task, 'base');

    if (options.base && options.keepDir) {
      options.base = path.join(options.base, taskConf.dir.src);
    }

    glob = _glob(glob, options, _taskBase, isNegated);

    // cache computed glob
    _globs[task] = {
      options: options,
      value: glob
    };

    return glob;
  }

  // join glob to 'base' option, or include task's base
  var base = options.base || _taskBase;
  if (base) glob = globjoin(base, glob);

  // [internal] negate glob if task-name starts with '!'
  if (_taskNegate) glob = _negateGlob(glob);

  return glob;
}

// =glob(glob, target)
// - builds a glob by replacing task-names with globs corresponding to config
// @param glob = the glob or array of globs to parse
// @param options [optional] = options to customize computed glob
//  - options.target - the task files to target, either 'src'/'main' or 'watch',
//  - options.base - base path to prepend (defaults to task's base path for task names)

wires.glob = function(glob, options) {
  return _glob(glob, options);
};

// =mainGlob(glob)
// - builds a glob by replacing task-names with globs for their main files
// @param glob = the glob or array of globs to parse

wires.mainGlob = function(glob, options) {
  // force 'src' target
  if (options && typeof options == 'object') {
    options.target = 'src';
  } else {
    options = 'src';
  }

  return wires.glob(glob, options);
};

// =watchGlob(glob)
// - builds a glob by replacing task-names with globs for their watch files
// @param glob = the glob or array of globs to parse

wires.watchGlob = function(glob, options) {
  // force 'src' target
  if (options && typeof options == 'object') {
    options.target = 'watch';
  } else {
    options = 'watch';
  }

  return wires.glob(glob, options);
};

// =Files
// ------

var _files = {};

// =files
// get files corresponding to given glob
// - detects task-names and replaces them with glob correspondig to config
// @param glob = the glob or array of globs to parse
// @param options [optional] = options to customize computed glob
//  - options.target - the task files to target, either 'src'/'main' or 'watch',
//  - options.base - base path to prepend (defaults to task's base path for task names)

wires.files = function(glob, options) {
  // parse glob to detect and replace task-names
  glob = wires.glob(glob, options);

  // return an array of files that correspond to the glob
  return globule.find(glob);
};

// =mainFiles
// get main files corresponding to given glob
// - detects task-names and replaces them with glob for their main files
// @param glob = the glob or array of globs to parse

wires.mainFiles = function( task, options ) {
    // force 'src' target
  if (options && typeof options == 'object') {
    options.target = 'src';
  } else {
    options = 'src';
  }

  return wires.files(task, options);
};

// =watchFiles
// get main files corresponding to given glob
// - detects task-names and replaces them with glob for their watch files
// @param glob = the glob or array of globs to parse

wires.watchFiles = function( task, options ) {
    // force 'src' target
  if (options && typeof options == 'object') {
    options.target = 'watch';
  } else {
    options = 'watch';
  }

  return wires.files(task, options);
};

// =Gulp
// -----

var _gulpIsMonkeyPatched = false;

// =_monkeyPatchGulp
// - monkey patch gulp methods

function _monkeyPatchGulp() {

  // only monkey patch once!
  if (_gulpIsMonkeyPatched) return;
  _gulpIsMonkeyPatched = true;

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
      deps = wires.getTaskConfig(name).deps || [];
    }

    // load function from task file if no task function is provided
    // or if a filename is provided instead
    if (!fn || typeof fn == 'string') {
      fn = wires.getTask(name, fn);
    }

    // delegate to original `gulp.task` method
    return _gulpAPI.task.call(gulp, name, deps, fn);
  };

  // =gulp.src
  gulp.src = function(globs, options) {
    // allow omitting the 'options' argument
    options = options || {};

    // use 'wires.src' to replace task names with globs in config
    globs = wires.mainGlob(globs);

    // delegate to original `gulp.src`
    var stream = _gulpAPI.src.call(gulp, globs, options);

    // automatically run plumber in debug mode
    if (wires.config.debug) {
      var plumberOpts = options.plumber || wires.config.plumber || {};

      return stream
        .pipe(wires.plumber(plumberOpts));
    }

    return stream;
  };

  // =gulp.watch
  gulp.watch = function(globs, options, handlers) {
    // use 'wires.watch' to replace task names with globs in config
    globs = wires.watchGlob(globs);

    // delegate to original `gulp.watch`
    return _gulpAPI.watch.call(gulp, globs, options, handlers);
  };

  // =gulp.dest
  gulp.dest = function(path, options) {
    // replace task name with destination path
    if (wires.hasTask(path)) path = wires.dest(path);

    // delegate to original `gulp.dest`
    return _gulpAPI.dest.call(gulp, path, options);
  };
}