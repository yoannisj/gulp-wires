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


var del = require('del');

gulp.task('clean:base-trial', function() {

  return del('examples/base-trial/dest');

});

gulp.task('base-trial', ['clean:base-trial'], function() {

  // var withBaseConfig = {
  //   // root: 'examples/base-trial',
  //   dir: {
  //     base: './src/text',
  //     dest: './with-base'
  //   },
  //   files: '**/*.txt'
  // };

  gulp.src('examples/base-trial/src/**/*.txt', {
    base: 'examples/base-trial'
  })
    .pipe(gulp.dest('examples/base-trial/dest/with-base'));

  // => 'examples/base-trial/with-base/**/*.txt'

  // var withoutBaseConfig = {
  //   // root: 'examples/base-trial',
  //   dir: {
  //     base: './',
  //     dest: './without-base'
  //   },
  //   files: 'src/text**/*.txt'
  // };

  gulp.src('examples/base-trial/src/text/**/*.txt')
    .pipe(gulp.dest('examples/base-trial/dest/without-base'));

    // => 'examples/base-trial/without-base/**/*.txt'

  gulp.src('examples/base-trial/src/stylesheets/scss/**/*.scss',{
    base: 'examples/base-trial/src/stylesheets/scss'
  })
    .pipe(gulp.dest('examples/base-trial/dest/with-base/'));

    // => 'examples/base-trial/with-base/stylesheets/css/**/*.scss'

  gulp.src('examples/base-trial/src/stylesheets/scss/**/*.scss')
    .pipe(gulp.dest('examples/base-trial/dest/without-base/stylesheets/css'));

    // => 'examples/base-trial/with-base/stylesheets/css/**/*.scss'

});

// Goals:
// * Configure task paths and globs in one place
// * Be able to use paths and globs from one task inside another task
// * ¿Automate cleaning destination? -> HARD if destination folder contains
// files coming from multiple tasks

// We need:
// 1. A *root* directory to which all task paths are relative
// 2. A *src* directory in which to search for files
// 3. A glob selecting files that we want in there
// 4. A *dest* directory in which to send files

// * the gulp.src 'glob' is build by joining 'root' + 'src' + 'files'
// * the gulp-src 'base option' is build by joining 'root' + 'src'
//    -> gets inserted between the 'dest' folder and filename
// * the gulp.dest path is build by joining 'root' + 'dest'

// var taskConf = {

//   root: {
//     src: './src',
//     dest: './dest'
//   },

//   base: './',
//   dir: './',
//   files: './**/*'

// };

// var sassConf = {

//   root: {
//     src: './src',
//     dest: './dest'
//   },
//   dir: {
//     src: './stylesheets',
//     dest: './css'
//   },
//   files: ['./**/*.css', './**/*.scss'],
//   rebase: false

//   // './src/stylesheets/main.scss' => './dest/css/main.css'
// };

// var sassConf2 = {

//   root: {
//     src: './src',
//     dest: './dest'
//   },
//   dir: {
//     src: './stylesheets',
//     dest: './css'
//   },
//   files: ['./**/*.css', './**/*.scss'],
//   rebase: true

//   // './src/stylesheets/main.scss' => './dest/stylesheets/css/main.css'

// };

// var sassConf3 = {

//   root: {
//     src: './src',
//     dest: './dest'
//   },
//   base: './stylesheets',
//   dest: './css',
//   files: './**/*.scss',
//   rebase: false

//   // './src/stylesheets/main.scss' => './dest/css/main.css'
// };

// var sassConf4 = {

//   root: {
//     src: './src',
//     dest: './dest'
//   },
//   dir: {
//     src: './stylesheets',
//     dest: './css',
//   },
//   files: './**/*.scss',
//   rebase: true

//   // './src/stylesheets/main.scss' => './dest/stylesheets/css/main.css'
// };

// var sassConf5 = {

//   root: {
//     src: './src',
//     dest: './dest'
//   },
//   base: './stylesheets/scss',
//   dest: './css',
//   files: ['./**/*.scss'],

//   // './src/stylesheets/scss/main.scss' => './dest/css/main.css'

// };

// var sassConf6 = {

//   root: {
//     src: './src',
//     dest: './dest'
//   },
//   dest: './css',
//   files: ['./stylesheets/scss/**/*.scss'],
//   rebase: false

//   // './src/stylesheets/scss/main.scss' => './dest/css/main.css'

// };

// var sassConf7 = {

//   root: {
//     src: './src',
//     dest: './dest'
//   },
//   dest: './css',
//   files: ['./stylesheets/scss/**/*.scss'],
//   rebase: true

//   // './src/stylesheets/scss/main.scss' => './dest/stylesheets/css/main.css'

// };
