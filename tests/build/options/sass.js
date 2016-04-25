var wires = require('../../../index.js')();

module.exports = {
  indentedSyntax: false,
  includePaths: [],
  precision: 5,
  outputStyle: wires.env.dev ? 'expanded' : 'expanded',
  sourceMap: !!(wires.env.dev)
};