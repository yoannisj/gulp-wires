var path = require('path');

// sample configuration used for tests
var confFile = './tests/config.js';
var conf = require(path.join(process.cwd(), confFile));

describe('the main function', function() {

  it('accepts a configuration object and parse it', function() {
    var wires = require('../index.js')(conf);

    expect(wires.config.foo).toBeDefined();
    expect(wires.config.bar).toEqual('bar/baz');
  });

  it('accepts a path to a module exporting a config object to parse', function() {
    var wires = require('../index.js')(confFile);

    expect(wires.config.foo).toBeDefined();
    expect(wires.config.bar).toEqual('bar/baz');
  });

  it('injects default configuration settings', function() {
    var wires = require('../index.js')(confFile);

    expect(wires.config.paths.build).toBeDefined();
    expect(wires.config.paths.options).toBeDefined();
    expect(wires.config.paths.tasks).toEqual('./build/tasks');
  });

  xit('optionally takes an options object', function() {

  });

  it('returns a static object, after setup', function() {
    var wires = require('../index.js')(confFile);

    expect(wires).toEqual(jasmine.any(Object));
    expect(wires).not.toEqual(jasmine.any(Function));
  });

});