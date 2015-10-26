'use strict';

var chai = require('chai');
var Q = require('q');
var expect = chai.expect;
var sinon = require('sinon');
var mockery = require('mockery');

chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));

describe('get by type', function () {
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

  describe('with valid type', function () {
    describe('with no packages in folder', function () {
      it('should eventually be empty array', function () {
        return expect(packages.getByType('dip')).to.eventually.be.empty.array;
      });
    });

    describe('with no access to folder', function () {
      before(function () {
        var fsMock = {
          readdir: sinon.stub().callsArgWith(1, {code: 'ENOPER'})
        };

        mockery.registerMock('fs', fsMock);
      });

      after(function () {
        mockery.deregisterMock('fs');
      });

      it('should eventually be rejected', function () {
        return expect(packages.getByType('dip')).to.eventually.be.rejectedWith({code: 'ENOPER'});
      });
    });
    describe('with some packages', function () {
      before(function () {
        var fsMock = {
          readdir: sinon.stub().callsArgWith(1, null, ['file1', 'file2']),
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

      it('should return list of packages', function () {
        return expect(packages.getByType('dip')).to.eventually.have.length(2);
      });

      describe('with full option', function () {
        before(function () {
          var jfMock = {
            readFile: sinon.stub().callsArgWith(1, null, {test: 'test'})
          };

          mockery.registerMock('jsonfile', jfMock);
        });

        after(function () {
          mockery.deregisterMock('jsonfile');
        });

        it('should return config data on each package', function () {
          return packages.getByType('dip', true)
            .then(function (packagesByType) {
              expect(packagesByType).to.have.length(2);

              packagesByType.forEach(function (packageByType) {
                expect(packageByType).to.have.deep.property('config');
              });
            });
        });
      });
    });
    describe('with some files', function () {
      before(function () {
        var fsMock = {
          readdir: sinon.stub().callsArgWith(1, null, ['file1', 'file2']),
          stat: sinon.stub().callsArgWith(1, null, {
            isDirectory: function () {
              return false;
            }
          })
        };

        mockery.registerMock('fs', fsMock);
      });

      after(function () {
        mockery.deregisterMock('fs');
      });

      it('should return list of packages', function () {
        return expect(packages.getByType('dip')).to.eventually.have.length(0);
      });
    });
  });

  describe('with invalid parameters', function () {
    describe('when type is not provided', function () {
      it('should reject and throw TypeError', function () {
        return expect(packages.getByType()).to.eventually.be.rejectedWith(TypeError);
      });
    });
    describe('when type is not a string', function () {
      it('should reject and throw TypeError', function () {
        return expect(packages.getByType(true)).to.eventually.be.rejectedWith(TypeError);
      });
    });
    describe('with non-valid type', function () {
      it('should be rejected with TypeError', function () {
        return expect(packages.getByType('test')).to.eventually.be.rejectedWith(TypeError);
      });
    });
  });
});