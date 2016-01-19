# Gulp Wires

**Under Construction**
Basic configuration for modular gulp tasks.

## Usage

Require wires in your `gulpfile.js` and initiliaze with proper configuration as follows:

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

Automatically load all tasks

    var wires = require('gulp-wires')('./build/config.js', true);

Load specified tasks only

    var wires = require('gulp-wires');
    wires('./build/config.js', ['my-task', 'my-other-task']);

Specify loaded tasks' dependencies

    var wires = require('gulp-wires');
    wires('./build/config.js', {
        'my-task': ['my-other-task'],
        'my-other-task': []
    });

Specify loaded task filenames

    var wires = require('gulp-wires');
    wires('./build/config.js', {
        'my-task': './path/to/task-file.js',
        'my-other-task': './other-task.js'
    });

Specify loaded task dependencies and filenames

    var wires = require('gulp-wires');
    wires('./build/config.js', {
        'my-task': {
            deps: ['my-other-task'],
            filename: './path/to/task-file.js'
        },
        'my-other-task': './other-task.js'
    });

### Configuration

The `config.js` file must export a function that receives `gulputil.env` as unique argument, and returns an object. Here is a sample configuration file with the minimum settings required for gulp-wires to work correctly, and their default values. It is equivalent to exporting an empty object.

    module.exports = function(env) {
        return {
            root: {
                tasks: './build/tasks/',
                options: './build/options/',
                plugins: './node_modules',
                src: './src',
                dest: './dest'
            },
            tasks: {
                'task-name': {
                    deps: [],
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
        }
    };

**Note**: You can reference other configuration settings using underscore templates (`'<%= other.setting.property %>'`).

**Note**: Inside task configurations, the `root`, `dir` and `files` properties can also be strings, which will then be used for all sub-properties.

**Note**: You can add your own configuration settings and then access them on the `wires.config` property.

To load a configuration object, you can either do it by running the `wire` function as show above, or by running the `loadConfig` method:

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
