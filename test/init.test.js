describe('initialise', function () {
  'use strict';

  var initialise = require('../')
    , chai = require('chai')
    , expect = chai.expect;

  it('should only call the init function once', function () {
    var hook = Object.create(null)
      , init = initialise.on(hook)
      , requires = 0;

    init('test', function called() {
      requires++;

      return 1;
    });

    hook.test;
    hook.test;

    expect(requires).to.equal(1);
  });

  it('should call the init function with the context of initialise', function () {
    var hook = Object.create(null)
      , init = initialise.on(hook)
      , requires = '';

    init('config', function config() {
      expect(this).to.equal(hook);

      requires += 'config;';
      return function () {};
    });

    init('test', function called() {
      expect(this).to.equal(hook);

      this.config();

      requires += 'test;';
      return;
    });

    hook.test;
    hook.test;

    expect(requires).to.equal('config;test;');
  });

  it('provides the init function with a register function', function (done) {
    var hook = Object.create(null)
      , init = initialise.on(hook)
      , flow = {};

    init('config', function config(register) {
      register('config', function () {
        flow.custom = 1;
      });

      return function () {};
    });

    init('test', function called(register) {
      this.config();

      register('test', 'custom');

      return {
        custom: function () {
          flow.method = 1;
        }
      };
    });

    init('nothing', function (register) {
      register('nothing');

      return {
        close: function () {
          flow.nothing = 1;
        }
      };
    });

    hook.test;
    hook.nothing;

    init.end(function () {
      expect(flow.custom).to.equal(1);
      expect(flow.method).to.equal(1);
      expect(flow.nothing).to.equal(1);
      done();
    });
  });

  it('provides the init function with a options object', function () {
    var hook = Object.create(null)
      , init = initialise.on(hook)
      , flow = {};

    init('config', function config(register, options) {
      expect(options).to.be.an('object');
      expect(options).to.have.property('test', 'optional');
      expect(options).to.have.property('more');
      expect(options.more).to.be.an('array');
      expect(options.more).to.include('options');
    }, { test: 'optional', more: ['options'] });

    init('noop', function noop(register, options) {
      expect(options).to.be.an('object');
      expect(Object.keys(options).length).to.equal(0);
      expect(arguments.length).to.equal(2);
    });

    hook.config;
    hook.noop;
  });

  it('supports async unregistering', function (done) {
    var hook = Object.create(null)
      , init = initialise.on(hook);

    init('foo', function (register) {
      register.async('foo', function (done) {
        setTimeout(done, 100);
      });

      return {};
    });

    init('meh', function (register) {
      register.async('meh', 'nothing');

      return {
        nothing: function (done) {
          return process.nextTick(done.bind(done, new Error('foo')));
        }
      };
    });

    hook.foo;
    hook.meh;

    init.end(function end(err) {
      expect(err.message).to.equal('foo');
      done();
    });
  });
});
