'use strict';

var chai = require('chai');
var Q = require('q');
var path = require('path');
var expect = chai.expect;
var sinon = require('sinon');
var mockery = require('mockery');

chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));

describe('get folder by package', function () {
  var packages;

  beforeEach(function () {
    var nachosConfigMock = {
      get: sinon.stub().returns(Q.resolve({packages: 'path'}))
    };

    var fsAccessMock = function (file, cb) {
      if (file.indexOf('notExist') !== -1) {
        return cb({code: 'ENOENT'});
      }

      if (file.indexOf('noPermissions') !== -1) {
        return cb({code: 'ENOPER'});
      }

      if (file.indexOf('tacos') === -1) {
        return cb(null, true);
      }

      return cb({code: 'ENOENT'});
    };

    mockery.registerMock('fs-access', fsAccessMock);
    mockery.registerMock('nachos-config', nachosConfigMock);
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    packages = require('../lib');
  });

  afterEach(function () {
    mockery.deregisterMock('fs-access');
    mockery.deregisterMock('nachos-config');
    mockery.disable();
  });

  describe('with invalid parameters', function () {
    describe('when package is not provided', function () {
      it('should reject and throw TypeError', function () {
        return expect(packages.getFolderByPackage()).to.eventually.be.rejectedWith(TypeError);
      });
    });
    describe('when package is not a string', function () {
      it('should reject and throw TypeError', function () {
        return expect(packages.getFolderByPackage(true)).to.eventually.be.rejectedWith(TypeError);
      });
    });
  });

  describe('with existing package in dips folder', function () {
    it('should return dips folder', function () {
      return expect(packages.getFolderByPackage('test')).to.eventually.be.equals(path.join('path', 'dips'));
    });
  });

  describe('without permissions to read file', function () {
    it('should be rejected', function () {
      return expect(packages.getFolderByPackage('noPermissions')).to.eventually.be.rejectedWith({code: 'ENOPER'});
    });
  });

  describe('without existing package', function () {
    it('should be rejected', function () {
      return expect(packages.getFolderByPackage('notExist')).to.eventually.be.rejectedWith(Error);
    });
  });
});