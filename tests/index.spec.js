var path = require('path');
var gutil = require('gulp-util');
var get_wires = require('../index.js');

// sample configuration used for tests
var confFile = './tests/build/config.js';
var conf = require(path.join(process.cwd(), confFile));

// =glob
// -----
describe('the `glob` method', function() {

  beforeEach(function() {
    this.wires = get_wires(confFile);
  });

  it('should not alter a simple glob', function() {
    expect(this.wires.glob('**/*.scss', 'src')).toEqual('**/*.scss');
    expect(this.wires.glob('!**/*.sass', 'src')).toEqual('!**/*.sass');
  });

  it('should return `undefined` if the name of an unexisting task is passed', function() {
    expect(this.wires.glob('deizjooi', 'src')).toBeUndefined();
    expect(this.wires.glob('deizjooi', 'watch')).toBeUndefined();
  });

  it('should replace tasks with corresponding globs', function() {
    expect(this.wires.glob('wiz', 'src')).toEqual('src/dirs/wiz/**/*');
    expect(this.wires.glob('sass', 'src')).toEqual('src/sass/*.scss');
  });

  it('should accept a target parameter to choose between task src or watch files', function() {
    expect(this.wires.glob('sass', 'src')).toEqual('src/sass/*.scss');
    expect(this.wires.glob('sass', 'watch')).toEqual('src/sass/**/*.scss');
  });

  it('should map the `main` target to `src` files', function() {
    expect(this.wires.glob('sass', 'main')).toEqual(this.wires.glob('sass', 'src'));
  });

  it('should accept arrays of globs and detect task-names inside', function() {
    var arr1In = ['!*.md', 'sass'];
    var arr1Out = ['!*.md', 'src/sass/*.scss'];
    var arr2In = ['some/path/**/*.js', 'foo'];
    var arr2Out = ['some/path/**/*.js', 'dest/foo/src/**/*'];

    expect(this.wires.glob(arr1In, 'src')).toEqual(jasmine.any(Array));
    expect(this.wires.glob(arr1In, 'src')).toEqual(arr1Out);
    expect(this.wires.glob(arr2In, 'src')).toEqual(arr2Out);
  });

  it('should parse nested task-names', function() {
    var task1In = 'nested-src';
    var task1Out = ['src/**/*.txt', 'src/sass/*.scss'];
    var task2In = 'nested-negated-src';
    var task2Out = ['src/sass/**/*', '!src/sass/*.scss'];
    var arr1In = ['nested-src', '**/*.png'];
    var arr1Out = ['src/**/*.txt', 'src/sass/*.scss', '**/*.png'];
    var arr2In = ['double-nested-src', '**/*.png'];
    var arr2Out = ['src/sass/**/*', 'src/**/*.txt', 'src/sass/*.scss', '**/*.png'];

    expect(this.wires.glob(task1In, 'src')).toEqual(task1Out);
    expect(this.wires.glob(task2In, 'src')).toEqual(task2Out);
    expect(this.wires.glob(arr1In, 'src')).toEqual(arr1Out);
    expect(this.wires.glob(arr2In, 'src')).toEqual(arr2Out);
  });

});