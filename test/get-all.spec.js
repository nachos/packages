'use strict';

var chai = require('chai');
var Q = require('q');
var expect = chai.expect;
var sinon = require('sinon');
var mockery = require('mockery');

chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));

describe('get all', function () {
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

  describe('with \'full\' option', function () {
    before(function () {
      var fsMock = {
        readdir: sinon.stub().callsArgWith(1, null, ['pkg1', 'pk22']),
        stat: sinon.stub().callsArgWith(1, null, {
          isDirectory: function () {
            return true;
          }
        })
      };
      var jfMock = {
        readFile: sinon.stub().callsArgWith(1, null, {test: 'test'})
      };

      mockery.registerMock('jsonfile', jfMock);
      mockery.registerMock('fs', fsMock);
    });

    after(function () {
      mockery.deregisterMock('fs');
      mockery.deregisterMock('jsonfile');
    });

    it('should return dictionary with 2 types filled with packages with config property', function () {
      return packages.getAll(true)
        .then(function (allPackages) {
          Object.keys(allPackages).forEach(function (key) {
            allPackages[key].forEach(function (pkg) {
              expect(pkg).to.have.deep.property('config');
            });
          });
        });
    });
  });

  describe('without \'full\' option', function () {
    before(function () {
      var fsMock = {
        readdir: sinon.stub().callsArgWith(1, null, ['pkg1', 'pk22']),
        stat: sinon.stub().callsArgWith(1, null, {
          isDirectory: function () {
            return true;
          }
        })
      };

      mockery.registerMock('fs', fsMock);
    });

    after(function () {
      mockery.deregisterMock('fs');
    });

    it('should return dictionary with 2 types filled with packages', function () {
      return packages.getAll()
        .then(function (allPackages) {
          expect(allPackages).to.have.property('dip');
          expect(allPackages).to.have.property('taco');
        });
    });
  });
});