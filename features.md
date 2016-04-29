# Gulp-Wires Features

+ Global config file

    + Global path settings
    + Task-specific settings
    + Separate 'main' and 'watch' files
    + Reference other settings (using expander)

+ Separate plugin/nodeJS option files
+ Separate task files

+ MonkeyPatch 'gulp.src', 'gulp.watch' and 'gulp.dest' to accept task-names
+ Stream helpers ('if', 'debug', 'rename', etc.)
+ Handle Stream errors automatically

+ Use paths and globs from other tasks
+ Dynamic file globs using task-names

+ Automatically load tasks from the tasks folder

# Gulp-Wires API

## Working with tasks

    var wires = require('gulp-wires')([ config, options ]);

    wires.getTask('task-name');
    wires.loadTask('task-name'[, dependencies ]);

## Working with plugins

    wires.options('pluginName'[, overrides ]);
    wires.plugin('pluginName'[, optionOverrides ]);

## Working with task files and globs

    wires.glob('task-name', target);
    wires.glob(['**/*.txt', 'task-name'], target);
    wires.glob(['**/*.txt', '!task-name'], target);

    wires.mainGlob('task-name'); // @alias wires.glob('task-name', 'main');
    wires.mainGlob(['**/*.txt', 'task-name']);
    wires.mainGlob(['**/*.txt', '!task-name']);

    wires.main('task-name'); // @alias wires.glob('task-name', 'main');

    wires.watchGlob('task-name'); // @alias wires.glob('task-name', 'watch');
    wires.watchGlob(['**/*.txt', 'task-name']);
    wires.watchGlob(['**/*.txt', '!task-name']);

    wires.watch('task-name'); // @alias wires.glob('task-name', 'watch');

    wires.files('task-name', target);
    wires.mainFiles('task-name'); // @alias wires.files('task-name', 'main');
    wires.watchFiles('task-name'); // @alias wires.files('task-name', 'watch');

## Working with task paths

    wires.path('task-name', target);

    wires.base('task-name'); // @alias wires.path('task-name', 'src');
    wires.dest('task-name'); // @alias wires.path('task-name', 'dest');

## Gulp Monkeypatching

    gulp.task('task-name');
    gulp.src('task-name');
    gulp.src(['/**/*.txt', 'task-name']);
    gulp.src(['/**/*.txt', '!task-name']);
    gulp.watch('task-name');
    gulp.watch(['/**/*.txt', 'task-name']);
    gulp.watch(['/**/*.txt', '!task-name']);
    gulp.dest('task-name');

## Writing tasks

    wires.util; // @alias require('gulp-util')
    wires.env; // @alias require('gulp-util').env
    wires.config // configuration hash, resolved and with defaults

**coming soon:**

    wires.if(condition, true[, false]);
    wires.unless(condition, false[, true]);

# Gulp-Wires Config

## Configuring Wires

The configuration object may contain lodash templates to cross-reference settings. By default, these templates have access to node's 'path' module, and 'lodash' (referenced by the `_`). Additional modules can be made available via the `imports` option.

### Default Configuration:

    {
        // modules/globals that are accessible inside lodash templates
        // inside this configuration object. Keys are the variables names
        // used to reference the modules/globals inside lodash templates.
        // Note that these defaults will always be imported. If you redefine
        // the `imports` setting below, it will merge your imports to it,
        // so that `path`, `_` and `env` are always available.
        imports: {
            'path': require('path'),
            '_': require('lodash'),
            'env': require('gulp-util').env
        },
        
        // base path for `tasksPath` and `optionsPath` settings
        // will be normalized to an absolute path
        buildPath: __dirname,
        
        // path to the tasks folder
        tasksPath: "./tasks",
        
        // path to the options folder
        optionsPath: "./options",
        
        // how task and option files are named
        // - 'kebab-case' => runs the task/plugin name through `_.kebabCase()`
        // - 'camel-case' => runs the task/plugin name through `_.camelCase()`
        // - 'snake-case' => runs the task/plugin name through `_.snakeCase()`
        // - {function} => accepts task/plugin name and returns the file name
        filename: 'kebab-case',
        
        // how to transform task and option filenames to their names as
        // referenced in config and API.
        keyname: 'kebab-case',
        
        // how task and options are named in config and API
        keyname: 'kebab-case',
        
        // activate debug mode to show warnings and notices
        debug: '<%= env.debug %>',
        
        // whether to monkey path the gulp api methods or not
        monkeyPath: true,
        
        // whether to automatically load all tasks in the tasks folder
        loadTasks: true,
        
        // options passed to 'gulp-load-plugins'
        loadPlugins: {
            debug: '<%= debug %>'
        },
        
        // default base path for tasks' source and destination directories
        root: {
            src: '<%= path.join(process.cwd(), "./src"); %>',
            dest: '<%= path.join(process.cwd(), "./dest"); %>',
        },
        
        // configuration settings for tasks inside the tasks folder
        // Keys are used to reference tasks in wires' API
        tasks: {}
    }

## Configuring Tasks

Tasks are configured via wires global `tasks` configuration setting. This is a hash, where each key/value pair defines a task's name/settings.

### Default task settings:

If no configuration settings are defined for a given task, it will use the following defaults:

    {
        // override the root setting, used as base path for the task's
        // base and dest directories
        root: {
            src: '<%= root.src  %>',
            dest: '<%= root.dest %>'
        },
        dir: {
            src: './',
            dest: './'
        },
        files: {
            main: './**/*',
            watch: './**/*'
        },
        deps: []
    }

### Compact configuration:

Wires defaults and normalizes task settings, so you don't have to be that prosaic when writing them:

* No need to give a `root` setting, it defaults to wires' global `root` setting
* The `dir` setting can be given as a simple string, which will be mapped to both `dir.src` **and** `dir.dest`
* The `files` setting can be given as a simple string, which will be mapped to `files.main` **and** `files.watch`

This means you can write minimal task settings like this:

    'my-task': {
        dir: './',
        files: './**/*.js'
    },
    
    'my-other-task': {
        files: './**/*.txt'
    }

