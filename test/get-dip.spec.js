'use strict';

var chai = require('chai');
var Q = require('q');
var expect = chai.expect;
var sinon = require('sinon');
var mockery = require('mockery');

chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));

describe('get dip', function () {
  var packages;

  beforeEach(function () {
    var nachosConfigMock = {
      get: sinon.stub().returns(Q.resolve({packages: 'path'}))
    };

    mockery.registerMock('nachos-config', nachosConfigMock);
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    packages = require('../lib');
  });

  afterEach(function () {
    mockery.deregisterMock('nachos-config');
    mockery.disable();
  });

  describe('with invalid parameters', function () {
    describe('when name is not provided', function () {
      it('should reject and throw TypeError', function () {
        return expect(packages.getDip()).to.eventually.be.rejectedWith(TypeError);
      });
    });
    describe('when name is not a string', function () {
      it('should reject and throw TypeError', function () {
        return expect(packages.getDip(true)).to.eventually.be.rejectedWith(TypeError);
      });
    });
  });

  describe('with valid dip name', function () {
    before(function () {
      var jfMock = {
        readFile: sinon.stub().callsArgWith(1, null, {test: 'test'})
      };

      mockery.registerMock('jsonfile', jfMock);
    });

    after(function () {
      mockery.deregisterMock('jsonfile');
    });

    it('should eventually return the config of the dip', function () {
      return expect(packages.getDip('test')).to.eventually.be.an.object;
    });
  });

  describe('with non-valid dip name', function () {
    before(function () {
      var jfMock = {
        readFile: sinon.stub().callsArgWith(1, null, null)
      };

      mockery.registerMock('jsonfile', jfMock);
    });

    after(function () {
      mockery.deregisterMock('jsonfile');
    });

    it('should eventually return the config of the dip', function () {
      return expect(packages.getDip('test')).to.eventually.to.have.property('config', null);
    });
  });
});