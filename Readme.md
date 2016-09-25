## Features

+ Configure base paths globally
+ Per task configuration for paths and globs
+ Separate 'main' and 'watch' files
+ Custom configuration settings
+ Dynamic configuration using npm modules and references to other setting values (uses *node-expander* and *lodash* templates)
+ Dynamic configuration using command-line flasg (uses *gulp-util*'s `env` property)
+ automatically load gulp plugins (uses *gulp-load-plugins*)
+ Define default options for gulp plugins in separate files
+ Write your tasks as separate CommonJS modules (exports the task function)
+ Reference globs, paths and files using task-names
+ Create globs and retrieve files dynamically using task-names
+ MonkeyPatch `gulp.src`, `gulp.watch` and `gulp.dest` to accept task-names and use the file-globs and paths as defined in global configuration
+ Automatically load and register tasks from the tasks folder
+ Automatically watch task src files using the `--watch` flag

**Coming Soon**:
+ Multipe src => dest directory mapping
+ More stream helpers ('rename', etc.)
+ Store data in memory to use across tasks

## API

### Working with tasks

    var wires = require('gulp-wires')([ config, options ]);

    wires.getTask('task-name');
    wires.getTask('task-name', fn);
    wires.loadTask('task-name');
    wires.loadTask('task-name', deps);
    wires.loadTask('task-name', deps, fn);

### Working with gulp plugins

Gulp plugins are automatically loaded using [gulp-load-plugins](https://github.com/jackfranklin/gulp-load-plugins), and plugin options can be set in separate files.

Plugin option files are loaded from the options directory, configured with the `optionsPath` setting. They need to share the plugin's name (without the 'gulp-'/'gulp.' prefix).

You can pass options to gulp-load-plugins with the `loadPlugins` setting. Please note that by default the gulp-load-plugins' `camelize` option is set to `false`.

    wires.options('pluginName'[, overrides ]);
    wires.plugin('pluginName'[, optionOverrides ]);

### Working with files and globs

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

### Working with paths

    wires.path('task-name', target);

    wires.base('task-name'); // @alias wires.path('task-name', 'src');
    wires.dest('task-name'); // @alias wires.path('task-name', 'dest');

### Gulp Monkeypatching

    gulp.task('task-name');
    gulp.src('task-name');
    gulp.src(['/**/*.txt', 'task-name']);
    gulp.src(['/**/*.txt', '!task-name']);
    gulp.watch('task-name');
    gulp.watch(['/**/*.txt', 'task-name']);
    gulp.watch(['/**/*.txt', '!task-name']);
    gulp.dest('task-name');

### Writing tasks

    wires.util; // @alias require('gulp-util')
    wires.env; // @alias require('gulp-util').env
    wires.config // configuration hash, resolved and with defaults

    wires.if(condition, true[, false]); // @alias require('gulpif')(condition, true, false);
    wires.unless(condition, false[, true]); // @alias require('gulpif')(condition, true, false);
    wires.debug(title); // prints out the files currently in the stream

**coming soon:**

    wires.data('namespace', data);

### Debugging tasks

When running your gulp tasks, you can pass the `--debug` flag to debug your tasks. This enables **gulp-plumber** and sets **gulp-load-plugins**'s `debug` option to true.

## Configuration

The configuration object may contain lodash templates to cross-reference settings. By default, these templates have access to node's 'path' module, and 'lodash' (referenced by the `_`). Additional modules can be made available via the `imports` setting.

As an example, here is the default configuration file, with all configuration settings available;

    module.exports = {
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
        // relative to `buildPath`
        tasksPath: "./tasks",
        
        // path to the options folder
        // relative to `buildPath`
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
        // relative to `process.cwd()`
        root: {
            src: './src',
            dest: './dest',
        },
        
        // configuration settings for tasks inside the tasks folder
        // Keys are used to reference tasks in wires' API
        tasks: {}
    };

### Configuring Tasks

Tasks are configured via wires global `tasks` configuration setting. This is a hash, where each key/value pair defines a task's name/settings.

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

#### Compact configuration:

*gulp-wires* defaults and normalizes task settings, so you don't have to be that prosaic when writing them:

- No need to give a `root` setting, it defaults to wires' global `root` setting
- The `dir` setting can be given as a simple string, which will be mapped to both `dir.src` **and** `dir.dest`
- The `files` setting can be given as a simple string, which will be mapped to `files.main` **and** `files.watch`

This means you can write minimal task settings like these:

    'my-task': {
        dir: './',
        files: './**/*.js'
    },

    'my-other-task': {
        files: './**/*.txt'
    }

#### Group Tasks

Group tasks, are tasks that simply run other tasks. The only configuration setting that these tasks need is the `deps` setting. Therefore, they can be defined as an array of dependency tasks:

    'my-group-task': ['my-task', 'my-other-task']

