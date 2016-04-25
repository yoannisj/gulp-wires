var gutil = require('gulp-util');

module.exports = function(err) {

  gutil.log(
    gutil.colors.cyan('Plumber'),
    gutil.colors.red('found unhandled error:\n'),
    error.toString()
  );

};