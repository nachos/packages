'use strict';

var chai = require('chai');
var Q = require('q');
var path = require('path');
var expect = chai.expect;
var sinon = require('sinon');
var mockery = require('mockery');

chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));

describe('get package', function () {
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

  describe('by name', function () {
    describe('with invalid parameters', function () {
      describe('when package name is not provided', function () {
        it('should reject and throw TypeError', function () {
          return expect(packages.getPackage()).to.eventually.be.rejectedWith(TypeError);
        });
      });
      describe('when package name is not a string', function () {
        it('should reject and throw TypeError', function () {
          return expect(packages.getPackage(true)).to.eventually.be.rejectedWith(TypeError);
        });
      });
    });

    describe('with existing package in tacos folder', function () {
      before(function () {
        var jfMock = {
          readFile: sinon.stub().callsArgWith(1, null, {test: 'test'})
        };

        var readdirStub = sinon.stub();

        readdirStub.withArgs(path.join('path', 'tacos')).callsArgWith(1, null, ['test', 'pkg2']);
        readdirStub.callsArgWith(1, null, []);

        var fsMock = {
          readdir: readdirStub,
          stat: sinon.stub().callsArgWith(1, null, {
            isDirectory: function () {
              return true;
            }
          })
        };

        mockery.registerMock('fs', fsMock);
        mockery.registerMock('jsonfile', jfMock);
      });

      after(function () {
        mockery.deregisterMock('fs');
        mockery.deregisterMock('jsonfile');
      });

      it('should return \'test\' package with full config', function () {
        return expect(packages.getPackage('test')).to.eventually.be.deep.equals({
          name: 'test',
          path: path.join('path', 'tacos', 'test'),
          type: 'taco',
          config: {
            test: 'test'
          }
        });
      });
    });

    describe('with non-existing package in dips folder', function () {
      it('should be rejected with error "dip doesn\'t exist"', function () {
        return expect(packages.getPackage('test')).to.eventually.be.rejectedWith('Could not find package named test');
      });
    });
  });

  describe('by name and type', function () {
    describe('with invalid parameters', function () {
      describe('when package name is not provided', function () {
        it('should reject and throw TypeError', function () {
          return expect(packages.getPackage()).to.eventually.be.rejectedWith(TypeError);
        });
      });
      describe('when package name is not a string', function () {
        it('should reject and throw TypeError', function () {
          return expect(packages.getPackage(true)).to.eventually.be.rejectedWith(TypeError);
        });
      });
      describe('when package type is not a string', function () {
        it('should reject and throw TypeError', function () {
          return expect(packages.getPackage('test', true)).to.eventually.be.rejectedWith(TypeError);
        });
      });
    });

    describe('with existing package in dips folder', function () {
      before(function () {
        var jfMock = {
          readFile: sinon.stub().callsArgWith(1, null, {test: 'test'})
        };

        mockery.registerMock('jsonfile', jfMock);
      });

      after(function () {
        mockery.deregisterMock('jsonfile');
      });

      it('should return \'test\' package', function () {
        return expect(packages.getPackage('test', 'dip')).to.eventually.be.deep.equals({
          path: path.join('path', 'dips', 'test'),
          config: {test: 'test'}
        });
      });
    });

    describe('with existing package in dips folder and no permissions', function () {
      before(function () {
        var jfMock = {
          readFile: sinon.stub().callsArgWith(1, {code: 'ENOPER'})
        };

        mockery.registerMock('jsonfile', jfMock);
      });

      after(function () {
        mockery.deregisterMock('jsonfile');
      });

      it('should return \'test\' package', function () {
        return expect(packages.getPackage('test', 'dip')).to.eventually.be.rejectedWith({code: 'ENOPER'});
      });
    });

    describe('with non-existing package in dips folder', function () {
      it('should be rejected with error "dip doesn\'t exist"', function () {
        return expect(packages.getPackage('test', 'dip')).to.eventually.be.rejectedWith('dip doesn\'t exist');
      });
    });
  });
});