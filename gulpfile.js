var gulp = require('gulp');
var gutil = require('gulp-util');
var plugins = require('gulp-load-plugins')();
var reporters = require('jasmine-reporters');

gulp.task('test', function() {

  var jasmineOptions = {
    reporter: new reporters.TerminalReporter({
      verbosity: 3,
      color: true,
      showStack: false
    })
  };

  var glob = gutil.env.spec ? gutil.env.spec + '.spec.js' : '**/*.spec.js';

  return gulp.src('tests/' + glob)
    .pipe(plugins.jasmine( jasmineOptions ));

});