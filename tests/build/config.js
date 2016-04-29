var path = require('path');
var _ = require('lodash');
var gutil = require('gulp-util');

module.exports = {

  imports: {
    'buildPath': __dirname,
    'path': path,
    '_': _,
    'env': gutil.env
  },

  root: {
    src: './tests/src',
    dest: './tests/dest'
  },

  debug: '<%= env.debug %>',

  // test custom settings and expanding
  foo: 'bar',
  bar: '<%= foo %>/baz',

  // test imports
  capitalize: '<%= _.capitalize( foo ) %>',
  join_paths: '<%= path.join("../some/joined/", "./dir/path") %>',

  paths: {
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
    },

    'nested-src': {
      files: ['**/*.txt', 'sass']
    },

    'nested-negated-src': {
      dir: '<%= tasks.sass.dir.src %>',
      files: ['**/*', '!sass']
    },

    'double-nested-src': {
      dir: '<%= tasks.sass.dir.src %>',
      files: {
        src: ['**/*', "nested-src"]
      }
    }

  }

};