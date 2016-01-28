var path = require('path');
var lodash = require('_');

module.exports = function( file, imports ) {
  // load config file
  var config = require(file)(wires.env);

  // make modules available inside the config object's templates
  // - inject default modules
  imports = assign({
    _: _,
    path: path
  }, imports || {});

  // expand configuration object
  config = expander.interface(config, {
    // expose 'lodash' and 'path' to contained templates
    imports: imports
  })();

  // inject default configuration options
  return _.merge({

    paths: {
      build: './build',
      tasks: '<%= paths.build %>/tasks',
      options: '<%= paths.build %>/options',
      src: './src',
      dest: './dest'
    },

    tasks: {}

  }, config);

};