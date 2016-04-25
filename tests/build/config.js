var gutil = require('gulp-util');

module.exports = {

  // test custom settings and expanding
  foo: 'bar',
  bar: '<%= foo %>/baz',

  // test imports
  capitalize: '<%= _.capitalize( foo ) %>',
  join_paths: '<%= p.join("../some/joined/", "./dir/path") %>',

  paths: {
    build: './tests/build/',
    src: './src',
    dest: './dest',
    bar: './some/path'
  },

  tasks: {

    'sass': {
      dir: {
        src: './sass',
        dest: './css'
      },
      files: {
        src: '*.scss',
        watch: '**/*.scss'
      }
    },

    'foo': {
      root: '<%= paths.dest %>',
      dir: {
        src: './foo/src',
        dest: './foo'
      },
      files: '**/*'
    },

    'bar': {
      root: '<%= paths.bar %>',
      files: '**/*.txt'
    },

    'wiz': {
      dir: './dirs/wiz'
    }

  }

};