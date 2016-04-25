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
// Exports a function that returns a unique _instance
// of the helper class (singleton/pseudo static class)

var wires = {};

// exported function to get static helper object
_isSetup = false;
module.exports = function(config, options) {

  // if called first time, set loadConfig
  if (!_isSetup || arguments.length) {
    _setup(config, options);
    _isSetup = true;
  }

  // return static helper object
  return wires;
};

// =setup
// Todo: Handle errors
// Todo: Throw Warnings if options.debug is set to true
// Todo: implement 'filename' option
// - accept 'kebab-case' and 'camel-case' keywords
// - accept a function receiving the task name and returning the file name
// Todo: Implement a 'data' method to share data through task functions
// Todo: If config is given as filepath, use config's base path as default 'build' path

_setup = function(config, options) {
  // inject default options
  wires.options = _.merge({}, {
    debug: false,
    imports: {},
    loadPlugins: {},
    monkeyPatch: true
  }, options || {});

  // options shared with 'gulp-load-plugins'
  if (wires.options.loadPlugins.debug === undefined) {
    wires.options.loadPlugins.debug = wires.options.debug;
  }

  // set  configuration
  wires.loadConfig(config, wires.options.imports);

  // load plugins
  wires.plugins = loadPlugins(wires.options.loadPlugins);

  if (wires.options.monkeyPath) {
    monkeyPathGulp();
  }
};

// =Gutil
// ------
// Shortcuts to gulp-util functionality

wires.util = gutil;
wires.env = gutil.env;


// =File-Loading Helpers
// ---------------------
// helper functions to load and cache files

var _cache = {
  options: {},
  tasks: {}
};

// =_load
// - laods a file given a path relative to the process cwd
function _load( filePath ) {
  return require( path.join(process.cwd(), filePath) );
}

// =_getPath
// - returns the path for files of a given type
function _getPath(type, name, filename) {
  var filePath =  path.join( wires.config.paths[type], filename || _.kebabCase(name) );

  // add file extension
  return _.endsWith(filePath, '.js') ? filePath : filePath + '.js';
}

// =_exists
// - checks whether a given task/options file exists
function _exists(type, name, filename ) {
  // cached files/modules exist
  if (_cache[type].hasOwnProperty(name)) return true;

  // search for module's file
  var filePath = _getPath(type, name, filename),
    file = globule.find(filePath, {
      cwd: process.cwd()
    });

  // return whether file was found or not
  return !!(file.length);
}

// =_get
// returns the value exported in a given task/options file
function _get( type, name, filename) {
  // return cached module
  if (_cache[type][name]) {
    return _cache[type][name];
  }

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

// =Debug
// ------

function _warn() {
  // prefix warning message with 'Wires'
  var segments = [gutil.colors.yellow('Wires')];

  // get warning segments and format them
  _.forEach([].slice.apply(arguments), function(segment) {
    segments.push( gutil.colors.yellow(segment) );
  });

  // add 'Wires:' in front of warning
  gutil.log.apply(gutil, segments);
}

// =Config
// -------
// load configuration options and inject defaults

// =loadConfig
wires.loadConfig = function(config, imports) {

  // default config filepath
  if (!config) config = './build/config.js';

  // allow passing a filepath as config
  if (typeof config == 'string') {
    config = _load(config);
  }

  // if resulting config is not an object
  if (typeof config !== 'object' || Array.isArray(config)) {
    // throw error: 'config must be an object, or a path to a node module that exports an object.'
  }

  // make modules available inside the config object's templates
  // - inject default modules
  imports = _.assign({
    _: _,
    p: path
  }, imports || {});

  // inject default configuration options
  config = _.merge({

    paths: {
      build: './build',
      tasks: '<%= p.join(paths.build, "./tasks") %>',
      options: '<%= p.join(paths.build, "./options") %>',
      src: './src',
      dest: './dest'
    },

    tasks: {}

  }, config);

  // expand and store configuration object
  wires.config = expander.interface(config, {
    imports: imports
  })();

  // chaining
  return wires;
};

// =Tasks
// ------
// load tasks from separate files

// =hasTask
// - returns whether a given task exists or not
wires.hasTask = function( name, filename ) {
  return _exists('tasks', name, filename);
};

// =getTask
// - returns a given task's function as defined in task file
wires.getTask = function(name, filename) {
  return _get('tasks', name, filename);
};

// =loadTasks
// - loads a set of tasks by registering it using `gulp.task`
wires.loadTasks = function(tasks) {
  // load all tasks found in the task folder by default
  // or when 'true' is passed
  if (!tasks || tasks === true) {
    // set 'tasks' to an array of task filenames
    tasks = globule.find(wires.config.root.tasks, {
      cwd: __dirname
    }).map(function(file) {
      return path.basename(file);
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
      // or a dependenciess array, or a filename
      else {
        wires.loadTask(task, tasks[task]);
      }
    }
  }
};

// =loadTask
// - loads a given task by registering it using `gulp.task`.
wires.loadTask = function(name, deps, filename) {
  // allow omitting the 'deps' argument
  if (!Array.isArray(deps)) {
    var conf = wires.config.tasks[name];
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

// =Task Configuration
// -------------------

var _taskConfigs = {};

// =getTaskConfig
// - loads task configuration hash, normalizes it and populates with defaults
wires.getTaskConfig = function(task) {

  // get task options from global configuration
  var conf = wires.config.tasks[task];

  // throw warning in debug mode if no options are defined and task file does not exist
  if (wires.options.debug && !conf && !wires.hasTask(task)) {
    _warn('task not found:', task);
  }

  // get cached task configurations
  if (_taskConfigs.hasOwnProperty(task)) return _taskConfigs[task];

  console.log('-----');
  console.log(task, 'conf::', conf);
  console.log('-----');

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
  if (typeof conf.files == 'string') {
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
// - veifies if options are set for a given plugin
wires.hasOptions = function(name, filename) {
  return _exists('options', name, filename);
};

// =getOptions
// - returns options for a given plugin as defined in options' file
wires.getOptions = function(name, filename) {
  // default to an empty object
  return _get('options', name, filename) || {};
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

// =Globs helper
// -------------

// cfg.tasks['my-task'].src = '**/*.js'
// cfg.tasks['my-other-task'].src = '**/*.coffee'
// _glob('src', 'my-task'); => (see cfg || undefined)
// _glob('src', ['my-task', '!**/*.spec.js']); => (see cfg || '!**/*.spec.js')
// _glob('src', ['my-task', 'my-other-task']); => (see cfg || undefined)
// _glob('src', '**/*.js'); => '**/*.js'
// _glob('src', ['**/*.js', '!**/*.spec.js']); => ['**/*.js', '!**/*.spec.js']

// =_glob( target, glob )
// - aliases task-names in a glob to corresponding globs in task's config
_glob = function(target, glob) {
  // allow array globs
  if (Array.isArray(glob)) {
    // apply to all items in the array glob
    // - flatten because some task names might be aliased to nested array globs
    var globs = _.flatMap(glob, function(pattern) {
      return _glob(pattern);
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

// =Paths
// ------
// get paths from task configuration objects

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

  // get config options (with defaults for missing options)
  var conf = wires.getTaskConfig(task);

  // resolve directory path
  var dirPath = path.join(conf.root[target], conf.dir[target]);

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
  // TODO: merge `_glob()` with `wires.files()` ?

  // namespace for task and target
  var ns = task + '_' + target;

  // returned cached file paths
  if (_files.hasOwnProperty(ns)) return _files[ns];

  // get config options and defaults if missing
  var conf = wires.getTaskConfig(task);

  // console.log(task, target, 'base', wires.dir(task, 'src'));
  // console.log(task, target, 'files::', conf.files[target]);

  // resolve files path (allow to set files as an array glob)
  var files = globjoin(wires.dir(task, 'src'), conf.files[target]);

  // cache and return files path
  _files[ns] = files;
  return files;
};

// =src
wires.src = function( task ) {
  return wires.files(task, 'src');
};

// =watch
wires.watch = function( task ) {
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