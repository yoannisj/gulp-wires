var path = require('path');
var _ = require('lodash');
var gutil = require('gulp-util');
var get_wires = require('../index.js');

// sample configuration used for tests
var confFile = './tests/build/config.js';
var confHash = require(path.join(process.cwd(), confFile));

// =main
// -----
describe('the exported main function', function() {

  it('returns a static object, after setup', function() {
    var wires = get_wires(confFile);

    expect(wires).toEqual(jasmine.any(Object));
    expect(wires).not.toEqual(jasmine.any(Function));
  });

  it('returns object unchanged since last call with arguments', function() {
    var wires = get_wires(confFile),
      wires2 = get_wires(false);

    expect(wires2.config.foo).toBeDefined();
    expect(wires2.config.bar).toEqual('bar/baz');
    expect(wires2.config.hello).toBeUndefined();
  });

});

// =loadConfig
// -----------
describe('the `loadConfig` method', function() {

  beforeEach(function() {
    this.wires = get_wires({});
  });

  it('accepts a configuration object and parses it', function() {
    this.wires.loadConfig(confHash);

    expect(this.wires.config.foo).toBeDefined();
    expect(this.wires.config.bar).toEqual('bar/baz');
  });

  it('accepts a path to a module exporting a config object to parse', function() {
    this.wires.loadConfig(confFile);

    expect(this.wires.config.foo).toBeDefined();
    expect(this.wires.config.bar).toEqual('bar/baz');
  });

  it('injects default configuration settings', function() {
    expect(this.wires.config.buildPath).toBeDefined();
    expect(this.wires.config.optionsPath).toBeDefined();
    expect(this.wires.config.tasksPath).toBeDefined();
  });

  it('exposes the path and lodash modules to config templates', function() {
    this.wires.loadConfig(confFile);

    expect(this.wires.config.capitalize).toEqual('Bar');
    expect(this.wires.config.join_paths).toEqual('../some/joined/dir/path');
  });

  it('accepts an `imports` setting exposing additional modules to config templates', function() {
    // load sample config
    this.wires.loadConfig({
      imports: {
        Color: require('color')
      },
      capitalize: '<%= _.capitalize( "bar" ) %>',
      join_paths: '<%= path.join("../some/joined/", "./dir/path") %>',
      hex_color: '<%= new Color({ r: 255, g: 222, b: 0 }).hexString() %>',
    });

    expect(this.wires.config.hex_color).toEqual('#FFDE00');
    expect(this.wires.config.capitalize).toEqual('Bar');
    expect(this.wires.config.join_paths).toEqual('../some/joined/dir/path');
  });

});

// =hasTask
// --------
describe('the `hasTask` method', function() {

  beforeEach(function() {
    this.wires = get_wires(confFile);
  });

  it('looks for a task file in the tasks directory', function() {
    expect(this.wires.hasTask('sass')).toBe(true);
    expect(this.wires.hasTask('derazra')).toBe(false);
  });

  it('takes a custom filename to search for as second argument', function() {
    expect(this.wires.hasTask('wick', 'wicked-yeah')).toBe(false);
    expect(this.wires.hasTask('wick', 'wicked')).toBe(true);
    expect(this.wires.hasTask('uglifyjs', 'uglify-js')).toBe(true);
  });

});

// =getTask
// --------
describe('the `getTask` method', function() {

  beforeEach(function() {
    this.wires = get_wires(confFile);
  });

  it('returns the task function exported by task file', function() {
    expect(this.wires.getTask('sass')).toEqual(jasmine.any(Function));
    expect(this.wires.getTask('uglifyjs', 'uglify-js')).toEqual(jasmine.any(Function));
  });

  it('returns undefined if the task file was not found', function() {
    expect(this.wires.getTask('deaeaad')).toBeUndefined();
  });

});

// =loadTask
// ---------

describe('the `loadTask` method', function() {

  beforeEach(function() {
    this.wires = get_wires(confFile);
  });

  xit('registers the given task using `gulp.task`', function() {

  });

  it('registers "group" tasks, which don\'t have a function file, and just contain a `deps` setting', function() {

  });

  it('understands tasks ');

});

// =getTaskConfig
// --------------
describe('the `getTaskConfig` method', function() {

  beforeEach(function() {
    this.wires = get_wires(_.assign(confHash, {
      buildPath: path.dirname(confFile),
      debug: true
    }));
  });

  it('should inject default config options', function() {
    var barConf = this.wires.getTaskConfig('bar');
    var dirDefaults = {
      src: './',
      dest: './'
    };

    expect(barConf.dir).toBeDefined();
    expect(barConf.dir).toEqual(dirDefaults);
    expect(barConf.files.src).not.toEqual('**/*');
  });

  it('should split the `root` option into `src` and `dest` targets', function() {
    var barConf = this.wires.getTaskConfig('bar');

    expect(barConf.root).toEqual(jasmine.any(Object));
    expect(barConf.root.dest).toBeDefined();
    expect(barConf.root.dest).toEqual(barConf.root.src);
    expect(barConf.root.src).toEqual(this.wires.config.paths.bar);
  });

  it('should split the `dir` option into `src` and `dest` targets', function() {
    var fooConf = this.wires.getTaskConfig('foo');
    var wizConf = this.wires.getTaskConfig('wiz');

    expect(wizConf.dir.src).toBeDefined();
    expect(wizConf.dir.dest).toBeDefined();
    expect(wizConf.dir.dest).toEqual(wizConf.dir.src);
    expect(fooConf.dir.src).not.toEqual(fooConf.dir.dest);
  });

  it('should split the `files` option into `src` and `watch` targets', function() {
    var fooConf = this.wires.getTaskConfig('foo');
    var sassConf = this.wires.getTaskConfig('sass');

    expect(fooConf.files.src).toBeDefined();
    expect(fooConf.files.watch).toEqual(fooConf.files.src);
    expect(fooConf.files.watch).toEqual('**/*');
    expect(sassConf.dir.src).not.toEqual(sassConf.dir.dest);
  });

  it('understands group task configurations, which are simple arrays of dependency tasks', function() {
    var groupConf = this.wires.getTaskConfig('group');

    expect(groupConf).toEqual(jasmine.any(Object));
    expect(groupConf.deps).toBeDefined();
  });

});

// =hasOptions
// -----------
describe('the `hasOptions` method', function() {

  beforeEach(function() {
    this.wires = get_wires(confFile);
  });

  it('looks for a task file in the tasks directory', function() {
    expect(this.wires.hasOptions('sass')).toBe(true);
    expect(this.wires.hasOptions('foo')).toBe(false);
  });

  it('takes a custom filename to search for, as second argument', function() {
    expect(this.wires.hasOptions('sass', 'sass.js')).toBe(true);
    expect(this.wires.hasOptions('sass', 'sass-options')).toBe(false);
  });

});

// =options
// --------
describe('the `options` method', function() {

  beforeEach(function() {
    this.wires = get_wires(confFile);
  });

  it('returns the options exported by an options file', function() {
    expect(this.wires.options('sass')).toBeDefined();
  });

  it('returns options as exported by the file (can be any type)', function() {
    expect(this.wires.options('sass')).toEqual(jasmine.any(Object));
    expect(this.wires.options('plumber')).toEqual(jasmine.any(Function));
  });

  it('returns an empty object as default options', function() {
    expect(this.wires.options('foo')).toBeDefined();
    expect(this.wires.options('foo')).toEqual({});
  });

});

// =plugin
// -------
describe('the `plugin` method', function() {

  it('should use the plugin options returned by `options` by default', function() {

  });

  it('should allow passing custom options on the fly', function() {

  });

  it('should delegate to a gulp plugin', function() {

  });

  it('should throw an error if the plugin was not found', function() {

  });

});

// =path
// -----
describe('the `path` method', function() {

  beforeEach(function() {
    this.wires = get_wires(confFile);
  });

  it('should return `undefined` if no task was found', function() {
    expect(this.wires.path('deizjooi', 'base')).toBeUndefined();
    expect(this.wires.path('deizjooi', 'dest')).toBeUndefined();
  });

  it('should throw a warning in debug mode if no task was found', function() {
    // load wires in debug mode
    this.wires = get_wires(_.assign(confHash, {
      buildPath: path.dirname(confFile),
      debug: true
    }));

    // spy, and run scenario
    spyOn(gutil, 'log');
    this.wires.path('dezrz', 'src');

    // verify gulp-util has thrown a warning
    expect(gutil.log).toHaveBeenCalled();
  });

  it('should return the base or dest path for a given task', function() {
    expect(this.wires.path('sass', 'src')).toEqual('tests/src/sass');
    expect(this.wires.path('sass', 'dest')).toEqual('tests/dest/css');
  });

  it('should accept a `target` argument to choose between the task\'s base or dest path', function() {
    expect(this.wires.path('sass', 'src')).toEqual('tests/src/sass');
    expect(this.wires.path('sass', 'dest')).toEqual('tests/dest/css');
    expect(this.wires.path('sass', 'src')).not.toEqual(this.wires.path('sass', 'dest'));
  });

  it('should understand directory settings defined as a common string', function() {
    expect(this.wires.path('wiz', 'src')).toEqual('tests/src/dirs/wiz');
    expect(this.wires.path('wiz', 'dest')).toEqual('tests/dest/dirs/wiz');
  });

  it('should map the `base` and `watch` targets to `src`', function() {
    expect(this.wires.path('sass', 'base')).toEqual(this.wires.path('sass', 'src'));
    expect(this.wires.path('sass', 'base')).not.toEqual(this.wires.path('sass', 'dest'));
    expect(this.wires.path('sass', 'watch')).toEqual(this.wires.path('sass', 'src'));
    expect(this.wires.path('sass', 'watch')).not.toEqual(this.wires.path('sass', 'dest'));
  });

});

// =base
// -----
describe('the `base` method', function() {

  beforeEach(function() {
    this.wires = get_wires(confFile);
  });

  it('should return the base path as defined by task configuration', function() {
    expect(this.wires.base('sass')).toEqual('tests/src/sass');
  });

  it('should understand directory settings defined as a common string', function() {
    expect(this.wires.dest('wiz')).toEqual('tests/dest/dirs/wiz');
  });

});

// =dest
// -----
describe('the `dest` method', function() {

  beforeEach(function() {
    this.wires = get_wires(confFile);
  });

  it('should return the dest path as defined by task configuration', function() {
    expect(this.wires.dest('sass')).toEqual('tests/dest/css');
  });

  it('should understand directory settings defined as a common string', function() {
    expect(this.wires.dest('wiz')).toEqual('tests/dest/dirs/wiz');
  });

});

// =glob
// -----
describe('the `glob` method', function() {

  beforeEach(function() {
    this.wires = get_wires(confFile);

    this.wizSrcGlob = 'tests/src/dirs/wiz/**/*';
    this.sassSrcGlob = 'tests/src/sass/*.scss';
    this.sassWatchGlob = 'tests/src/sass/**/*.scss';
    this.sassFilesGlob = ['tests/src/sass/*.scss', 'tests/src/sass/**/*.scss'];
    this.fooSrcGlob = 'tests/dest/foo/src/**/*';

    this.nestedSrcGlob = ['tests/src/**/*.txt', this.sassSrcGlob];
    this.nestedNegatedSrcGlob = ['tests/src/sass/**/*', '!' + this.sassSrcGlob];
    this.doubleNestedSrcGlob = _.union(['tests/src/sass/**/*'], this.nestedSrcGlob);
  });

  it('should not alter a simple glob', function() {
    expect(this.wires.glob('**/*.scss', 'src')).toEqual('**/*.scss');
    expect(this.wires.glob('!**/*.sass', 'src')).toEqual('!**/*.sass');
  });

  xit('should return `undefined` if the name of an unexisting task is passed', function() {
    expect(this.wires.glob('deizjooi', 'src')).toBeUndefined();
    expect(this.wires.glob('deizjooi', 'watch')).toBeUndefined();
  });

  it('should replace tasks with corresponding globs', function() {
    expect(this.wires.glob('wiz', 'src')).toEqual(this.wizSrcGlob);
    expect(this.wires.glob('sass', 'src')).toEqual(this.sassSrcGlob);
  });

  it('should accept a target argument to choose between task src or watch globs', function() {
    expect(this.wires.glob('sass', 'src')).toEqual(this.sassSrcGlob);
    expect(this.wires.glob('sass', 'watch')).toEqual(this.sassWatchGlob);
  });

  it('should map the `main` target to `src`', function() {
    expect(this.wires.glob('sass', 'main')).toEqual(this.wires.glob('sass', 'src'));
  });

  it('should return `src` AND `watch` file globs if no target is specified', function() {
    expect(this.wires.glob('sass')).toEqual(this.sassFilesGlob);
  });

  it('should accept arrays of globs and detect task-names inside', function() {
    expect(this.wires.glob(['!*.md', 'sass'], 'src')).toEqual(jasmine.any(Array));
    expect(this.wires.glob(['!*.md', 'sass'], 'src')).toEqual(_.union(['!*.md'], [this.sassSrcGlob]));
    expect(this.wires.glob(['some/path/**/*.js', 'foo'], 'src')).toEqual(_.union(['some/path/**/*.js'], [this.fooSrcGlob]));
  });

  it('should parse nested task-names', function() {
    expect(this.wires.glob('nested-src', 'src')).toEqual(this.nestedSrcGlob);
    expect(this.wires.glob('nested-negated-src', 'src')).toEqual(this.nestedNegatedSrcGlob);
    expect(this.wires.glob(['nested-src', '**/*.png'], 'src')).toEqual(_.union(this.nestedSrcGlob, ['**/*.png']));
    expect(this.wires.glob(['double-nested-src', '**/*.png'], 'src')).toEqual(_.union(this.doubleNestedSrcGlob, ['**/*.png']));
  });

  it('should accept a `base` optoin that overrides task base paths', function() {
    var opts = {
      target: 'src',
      base: 'some/path'
    };

    expect(this.wires.glob('sass', opts)).toEqual('some/path/*.scss');
    expect(this.wires.glob('nested-src', opts)).toEqual(['some/path/**/*.txt', 'some/path/*.scss']);
    expect(this.wires.glob('nested-negated-src', opts)).toEqual(['some/path/**/*', '!some/path/*.scss']);
    expect(this.wires.glob(['nested-src', '**/*.png'], opts)).toEqual(['some/path/**/*.txt', 'some/path/*.scss', 'some/path/**/*.png']);
    expect(this.wires.glob(['double-nested-src', '**/*.png'], opts)).toEqual(['some/path/**/*', 'some/path/**/*.txt', 'some/path/*.scss', 'some/path/**/*.png']);
  });

});

// =files
// ------
describe('the `files` method', function() {

  beforeEach(function() {
    this.wires = get_wires(confFile);

    this.barFiles = [
      'tests/some/path/concept.txt',
      'tests/some/path/content.txt'
    ];

    this.sassSrc = [
      'tests/src/sass/_part.scss',
      'tests/src/sass/alternate.scss',
      'tests/src/sass/main.scss'
    ];

    this.sassWatch = _.union(this.sassSrc, [
      'tests/src/sass/modules/_base.scss',
      'tests/src/sass/modules/_layout.scss',
      'tests/src/sass/modules/_typo.scss'
    ]);

    this.barSassSrc = _.union(this.sassSrc, this.barFiles);

    this.jsGlob = 'tests/src/**/*.js';

    this.jsFiles = [
      'tests/src/js/lib.js',
      'tests/src/js/main.js'
    ];

    this.barJsFiles = _.union(this.barFiles, this.jsFiles);
  });

  it('should fetch the targeted files of a given task', function() {
    expect(this.wires.files('bar', 'src')).toEqual(this.barFiles);
    expect(this.wires.files('sass', 'src')).toEqual(this.sassSrc);
    expect(this.wires.files('sass', 'watch')).toEqual(this.sassWatch);
  });

  it('should accept a `target` argument to choose between src and watch files', function() {
    expect(this.wires.files('sass', 'src')).not.toEqual(this.wires.files('sass', 'watch'));
  });

  it('should accept an array of globs', function() {
    expect(this.wires.files(['sass', 'bar'], 'src')).toEqual(this.barSassSrc);
  });

  it('should accept arbitrary globs', function() {
    expect(this.wires.files(this.jsGlob)).toEqual(this.jsFiles);
  });

  it('should accept a mix of arbitrary globs and task-names', function() {
    expect(this.wires.files(['bar', this.jsGlob], 'src')).toEqual(this.barJsFiles);
  });

  // =mainFiles
  // ----------
  describe('the `mainFiles` method', function() {

    it('should fetch the main files of a given task', function() {
      expect(this.wires.mainFiles('sass')).toEqual(this.sassSrc);
      expect(this.wires.mainFiles('bar')).toEqual(this.barFiles);
    });

    it('should accept arbitrary globs', function() {
      expect(this.wires.mainFiles(this.jsGlob)).toEqual(this.jsFiles);
    });

  });

  // =watchFiles
  // -----------
  describe('the `watchFiles` method', function() {

    it('should fetch the watch files of a given task', function() {
      expect(this.wires.watchFiles('sass')).toEqual(this.sassWatch);
      expect(this.wires.watchFiles('bar')).toEqual(this.barFiles);
    });

    it('should accept arbitrary globs', function() {
      expect(this.wires.watchFiles(this.jsGlob)).toEqual(this.jsFiles);
    });

  });

});
