# Gulp Wires

**Under Construction**
Basic configuration for modular gulp tasks.

## Usage

Require wires in your `gulpfile.js` and initiliaze with proper configuration as follows:

### Require and setup

Specify path to configuration module

    var wires = require('gulp-wires')('./build/config.js');

Pass configuration object

    var wires = require('gulp-wires')({
        root: { src: './src', dest: './dest' },
        tasks: {
            'my-task': { /* ... */ },
            'my-other-task': { /* ... *. }
        }
    });

### Loading Tasks

Load a list of tasks

    wires.loadTasks(['my-task', 'my-other-task']);

Specify loaded task dependencies

    wires.loadTasks({
        'my-task': ['my-other-task'],
        'my-other-task': []
    });

Specify loaded task filenames

    wires.loadTasks({
        'my-task': './path/to/task-file.js',
        'my-other-task': './other-task.js'
    });

Specify loaded task dependencies and filenames

    wires.loadTasks({
        'my-task': {
            deps: ['my-other-task'],
            filename: './path/to/task-file.js'
        },
        'my-other-task': './other-task.js'
    });

### Configuration

The configuration module must export a configuration object. Here is a sample configuration file with the minimum settings required for gulp-wires to work correctly, and their default values. It is equivalent to exporting an empty object.

    module.exports = {
        root: {
            tasks: './build/tasks/',
            options: './build/options/',
            plugins: './node_modules',
            src: './src',
            dest: './dist'
        },
        tasks: {
            'task-name': {
                root: {
                    src: '<%= root.src %>',
                    dest: '<%= root.dest %>'
                },
                dir: {
                    src: './',
                    dest: './'
                }
                files: {
                    src: './*'
                    watch: './**/*'
                }
            },
            'other-task': {
                /* (see example above for all options available) */
            }
        }
    };

**Note**: You can reference other configuration settings using underscore templates (`'<%= other.setting.property %>'`).

**Note**: Inside task configurations, the `root`, `dir` and `files` properties can also be strings, which will then be used for all sub-properties.

**Note**: You can add your own configuration settings and then access them on the `wires.config` property.

You can use `gulp-util` to set environment specific configuration settings:

    var env = require('gulp-util').env;
    module.exports = {
        root: {
            dest: env.dev ? './build/dev/' : './build/prod/'
        }
    };

You can load a configuration object either by passing it to the main function exported by `gulp-wire` (see 'Require and Setup' above), or by running the `loadConfig` method later on:

    var wires = require('gulp-wires');
    wires.loadConfig( './build/config.js' );

## API

+ `wires.loadTask('task-name'[, deps ]);`

    Loads a given task and registers it using `gulp.task`.

+ `wires.setting([, 'setting... ])`

    Return the value of a setting as set in `config.js`. Returns `undefined` if setting is not found.

### Working with tasks

+ `wires.src(taskName);`

    Returns glob for the task's source files. You can also pass an array of tasks names or a mix between task-names and plain glob patterns.

+ `wires.watch(taskName);`

    Returns glob for the task's watched files. You can also pass an array of tasks names or a mix between task-names and plain glob patterns.

+ `wires.base(taskName);`

    Returns a the task's source/watch files' base path.

+ `wires.dest(taskName);`

    Returns the task's destination path.

+ `wires.loadTask(name[, deps, filename ])`;

    Loads a given task and registers it using `gulp.task`.

+ `gulp.src`, `gulp.watch`, `gulp.dest`

    Wires monkey-patches gulp's main methods so that you can pass task-names like you would to `wires.src`, `wires.watch`, `wires.dest`.

### Working with gulp plugins

`wires.options('plugin-name')`

Returns the options set in the plugin's options file. Returns `{}` if the options file does not exist.

`wires.plugin('plugin-name'[, options ])`

Runs a gulp plugin (camelCases name). Uses options returned by `wires.options` by default, or custom options you pass. Throws an error if the options file does not exist.

#### Plugin options modules

The default options passed to your gulp-plugins by `gulp.plugin` can be set in a separate options module. Plugin option files are loaded from the path specified by `config.root.options`. Here is an example options file for `gulp-sass` (typically './build/options/sass.js');

    module.exports = {
        indentType: 'space',
        indentWidth: 2,
        outputStyle: 'expanded',
        precision: 8,
        sourceMap: true
    };

You can use `gulp-util` to set environment specific configuration settings:

    var env = require('gulp-util').env;
    module.exports = {
        outputStyle: env.dev ? 'expanded' : 'compressed',
        sourceMap: env.dev
    };
