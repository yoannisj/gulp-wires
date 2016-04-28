var path = require('path');
var gutil = require('gulp-util');
var get_wires = require('../index.js');

// sample configuration used for tests
var confFile = './tests/build/config.js';
var conf = require(path.join(process.cwd(), confFile));

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
      wires2 = get_wires();

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
    this.wires.loadConfig(confFile);
  });

  it('accepts a configuration object and parses it', function() {
    expect(this.wires.config.foo).toBeDefined();
    expect(this.wires.config.bar).toEqual('bar/baz');
  });

  it('accepts a path to a module exporting a config object to parse', function() {
    expect(this.wires.config.foo).toBeDefined();
    expect(this.wires.config.bar).toEqual('bar/baz');
  });

  it('injects default configuration settings', function() {
    expect(this.wires.config.paths.build).toBeDefined();
    expect(this.wires.config.paths.options).toBeDefined();
    expect(this.wires.config.paths.tasks).toEqual('tests/build/tasks');
  });

  it('exposes the path and lodash modules to config templates', function() {
    expect(this.wires.config.capitalize).toEqual('Bar');
    expect(this.wires.config.join_paths).toEqual('../some/joined/dir/path');
  });

  it('accepts an `imports` hash exposing additional modules to config templates', function() {
    // load sample config
    this.wires.loadConfig({
      capitalize: '<%= _.capitalize( "bar" ) %>',
      join_paths: '<%= p.join("../some/joined/", "./dir/path") %>',
      hex_color: '<%= new Color({ r: 255, g: 222, b: 0 }).hexString() %>',
    }, {
      Color: require('color')
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
    expect(this.wires.hasTask('foo')).toBe(false);
  });

  it('takes a custom filename to search for as second argument', function() {
    expect(this.wires.hasTask('sass', 'sass.js')).toBe(true);
    expect(this.wires.hasTask('sass', 'sass-options')).toBe(false);
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
    expect(this.wires.getTask('foo')).toBeUndefined();
  });

});

// =getTaskConfig
// --------------
describe('the `getTaskConfig` method', function() {

  beforeEach(function() {
    this.wires = get_wires(confFile, {
      debug: true
    });
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

// =getOptions
// -----------
describe('the `getOptions` method', function() {

  beforeEach(function() {
    this.wires = get_wires(confFile);
  });

  it('returns the options exported by an options file', function() {
    expect(this.wires.getOptions('sass')).toBeDefined();
  });

  it('returns options as exported by the file (can be any type)', function() {
    expect(this.wires.getOptions('sass')).toEqual(jasmine.any(Object));
    expect(this.wires.getOptions('plumber')).toEqual(jasmine.any(Function));
  });

  it('returns an empty object as default options', function() {
    expect(this.wires.getOptions('foo')).toBeDefined();
    expect(this.wires.getOptions('foo')).toEqual({});
  });

});

// =plugin
// -------
describe('the `plugin` method', function() {

  it('should use the plugin options returned by `getOptions` by default', function() {

  });

  it('should allow passing custom options on the fly', function() {

  });

  it('should delegate to a gulp plugin', function() {

  });

  it('should throw an error if the plugin was not found', function() {

  });

});

// =base
// -----
describe('the `base` method', function() {

  beforeEach(function() {
    this.wires = get_wires(confFile);
  });

  it('should return the base path of src files as defined by task configuration', function() {
    expect(this.wires.base('sass')).toEqual('src/sass');
  });

  it('should understand directory settings defined as a common string', function() {
    expect(this.wires.base('foo')).toEqual('dest/foo/src');
  });

  // it('should return path argument if no task was found', function() {
  //   expect(this.wires.base('./hello/world')).toEqual('hello/world');
  //   expect(this.wires.base('bar')).toEqual('bar');
  // });

  xit('should throw a warning in debug mode if no task was found', function() {
    // spy, and run scenario
    spyOn(gutil, 'log');
    this.wires.base('bar');

    // verify gulp-util has thrown a warning
    expect(gutil.log).toHaveBeenCalledWith();
  });

});

// =dest
// -----
describe('the `dest` method', function() {

  beforeEach(function() {
    this.wires = get_wires(confFile, {
      debug: true
    });
  });

  it('should return the dest path of src files as defined by task configuration', function() {
    expect(this.wires.dest('sass')).toEqual('dest/css');
  });

  it('should understand directory settings defined as a common string', function() {
    expect(this.wires.dest('wiz')).toEqual('dest/dirs/wiz');
  });

  // it('should return argument unchanged if no task configuration was found', function() {

  // });

  it('should throw a warning in debug mode if no task was found', function() {
    // spy, and run scenario
    spyOn(gutil, 'log');
    this.wires.dest('UNKNOWN_TASK');

    // verify gulp-util has thrown a warning
    expect(gutil.log).toHaveBeenCalled();
  });

});

// =src
// ----
describe('the `src` method', function() {

  beforeEach(function() {
    this.wires = get_wires(confFile, {
      debug: true
    });
  });

  it('should return the src files glob defined by task configuration', function() {
    expect(this.wires.src('foo')).toEqual('dest/foo/src/**/*');
  });

  it('should understand directory settings defined as a common string', function() {
    expect(this.wires.src('wiz')).toEqual(this.wires.watch('wiz'));
    expect(this.wires.src('wiz')).toEqual('src/dirs/wiz/**/*');
  });

  it('should understand files setting defined as a common string', function() {
    expect(this.wires.src('foo')).toEqual(this.wires.watch('foo'));
    expect(this.wires.src('foo')).toEqual('dest/foo/src/**/*');
  });

  // TODO: merge 'wires.files' with '_glob'
  xit('should allow to create new globs by replacing task names with corresponding \'sub\'-glob', function() {

  });

  // TODO: merge 'wires.files' with '_glob'
  xit('should leave glob arguments unchanged', function() {

  });

  it('should throw a warning in debug mode if no task was found', function() {
    // spy, and run scenario
    spyOn(gutil, 'log');
    this.wires.src('UNKNOWN_TASK');

    // verify gulp-util has thrown a warning
    expect(gutil.log).toHaveBeenCalled();
  });

});

// =watch
// ------
xdescribe('the `watch` method', function() {

  beforeEach(function() {
    this.wires = get_wires(confFile, {
      debug: true
    });
  });

  it('should return the watch files glob defined by a task settings', function() {
    expect(this.wires.watch('sass')).toEqual('src/sass/**/*.scss');
  });

  it('should understand directory settings defined as a common string', function() {
    expect(this.wires.watch('wiz')).toEqual('src/dirs/wiz/**/*');
  });

  it('should understand files setting defined as a common string', function() {
    expect(this.wires.watch('foo')).toEqual('dest/foo/src/**/*');
  });

  // TODO: merge 'wires.files' with '_glob'
  xit('should allow to create new globs by replacing task names with corresponding \'sub\'-glob', function() {

  });

  // TODO: merge 'wires.files' with '_glob'
  xit('should leave glob arguments unchanged', function() {

  });

  it('should throw a warning in debug mode if no task was found', function() {
    // spy, and run scenario
    spyOn(gutil, 'log');
    this.wires.watch('UNKNOWN_TASK');

    // verify gulp-util has thrown a warning
    expect(gutil.log).toHaveBeenCalledWith();
  });

});
