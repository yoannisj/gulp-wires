var gutil = require('gulp-util');

module.exports = {

  // dummy custom configuration
  foo: 'bar',
  bar: '<%= foo %>/baz',

  paths: {
    tasks: '<%= paths.build %>/tasks',
    src: './src',
    dest: './dest'
  },

  tasks: {
    'sass': {
    }
  }

};