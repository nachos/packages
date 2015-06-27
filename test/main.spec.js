'use strict';

var chai = require('chai');
var Q = require('q');
var path = require('path');
var expect = chai.expect;
var sinon = require('sinon');
var mockery = require('mockery');

chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));

describe('packages', function () {
  xdescribe('types', function () {
    it('should return list of types', function () {
      var packages = require('../lib');

      expect(packages.Packages.TYPES).to.have.length(2);
    });
  });

  xdescribe('get folder by type', function () {
    describe('with config initialized with packages property', function () {
      var packages;

      beforeEach(function () {
        var nachosConfigMock = function () {
          return {
            get: sinon.stub().returns(Q.resolve({packages: 'path'}))
          };
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

      describe('with valid parameters', function () {
        it('should return dips folder', function () {
          return expect(packages.getFolderByType('dip')).to.eventually.be.equals(path.join('path', 'dips'));
        });
        it('should return tacos folder', function () {
          return expect(packages.getFolderByType('taco')).to.eventually.be.equals(path.join('path', 'tacos'));
        });
      });

      describe('with invalid parameters', function () {
        it('should reject and throw TypeError', function () {
          return expect(packages.getFolderByType('invalid')).to.eventually.be.rejectedWith(TypeError);
        });
      });
    });

    describe('without config initialized with packages property', function () {
      var packages;

      beforeEach(function () {
        var nachosConfigMock = function () {
          return {
            get: sinon.stub().returns(Q.resolve({}))
          };
        };

        var nachosHomeMock = sinon.stub().returns('home/path');

        mockery.registerMock('nachos-config', nachosConfigMock);
        mockery.registerMock('nachos-home', nachosHomeMock);
        mockery.enable({
          useCleanCache: true,
          warnOnReplace: false,
          warnOnUnregistered: false
        });
        packages = require('../lib');
      });

      afterEach(function () {
        mockery.deregisterMock('nachos-config');
        mockery.deregisterMock('nachos-home');
        mockery.disable();
      });

      describe('with valid parameters', function () {
        it('should return dips folder', function () {
          return expect(packages.getFolderByType('dip')).to.eventually.be.equals(path.join('home/path', 'dips'));
        });
        it('should return tacos folder', function () {
          return expect(packages.getFolderByType('taco')).to.eventually.be.equals(path.join('home/path', 'tacos'));
        });
      });

      describe('with invalid parameters', function () {
        it('should reject and throw TypeError', function () {
          return expect(packages.getFolderByType('invalid')).to.eventually.be.rejectedWith(TypeError);
        });
      });
    });

    describe('check folder caching', function () {
      var packages;
      var stub;

      before(function () {
        stub = sinon.stub().returns(Q.resolve({packages: 'path'}));

        var nachosConfigMock = function () {
          return {
            get: stub
          };
        };

        mockery.registerMock('nachos-config', nachosConfigMock);
        mockery.enable({
          useCleanCache: true,
          warnOnReplace: false,
          warnOnUnregistered: false
        });
        packages = require('../lib');
      });

      after(function () {
        mockery.deregisterMock('nachos-config');
        mockery.disable();
      });

      it('should save folder in cache and call nachos config once', function (done) {
        packages.getFolderByType('dip')
          .then(function () {
            return packages.getFolderByType('dip');
          })
          .then(expect(stub).to.have.been.calledOnce)
          .done(function () {
            done();
          });
      });
    });
  });
});