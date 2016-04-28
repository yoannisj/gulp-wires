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

    wires.watchGlob('task-name'); // @alias wires.glob('task-name', 'watch');
    wires.watchGlob(['**/*.txt', 'task-name']);
    wires.watchGlob(['**/*.txt', '!task-name']);

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
        paths: {
            build: './build',
            tasks: '<%= path.join(paths.build, "./tasks") %>',
            options: '<%= path.join(paths.build, "./options") %>',
            src: './src',
            dest: './dest'
        },
                
        tasks: {}
    }

    {        
        options: {
            pluginsPath: './node_modules',
            pluginsPattern: 'gulp-*',
            buildPath: './build',
            optionsPath: '<%= options.buildPath %>/options',
            tasksPath: '<%= options.buildPath %>/tasks'
        }
        
        root: {
            src: './src',
            dest: './dest'
        },
        
        tasks: {}
    }

    {
        paths: {
            src: './',
            dest: './',
            plugins: './node_modules',
            build: './build',
            options: '<%= paths.build %>/options',
            tasks: '<%= paths.build %>/tasks',
        },
        
        tasks: {}
    }

## Configuring Tasks

### Default configuration:

    {
        root: {
            src: '<%= paths.src  %>',
            dest: '<%= paths.dest %>'
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

No need to give a `root` setting, it has defaults.
The `dir` setting can be given as a simple string, which will be mapped to both `dir.src` **and** `dir.dest`.
The `files` setting can be given as a simple string, which will be mapped to `files.main` **and** `files.watch`.

    {
        dir: './',
        files: './**/*'
    }

