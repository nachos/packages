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
  describe('types', function () {
    it('should return list of types', function () {
      var packages = require('../lib');

      expect(packages.Packages.TYPES).to.have.length(2);
    });
  });

  describe('get folder by type', function () {
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

      it('should save folder in cache and call nachos config once', function () {
        return packages.getFolderByType('dip')
          .then(function () {
            return packages.getFolderByType('dip');
          })
          .then(expect(stub).to.have.been.calledOnce);
      });
    });
  });

  describe('get folder by package', function () {
    var packages;
    var fs = require('fs');

    beforeEach(function () {
      var nachosConfigMock = function () {
        return {
          get: sinon.stub().returns(Q.resolve({packages: 'path'}))
        };
      };

      sinon.stub(fs, 'access', function (file, cb) {
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
      });

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
      fs.access.restore();
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

  describe('get package', function () {
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

    describe('with non-existing package in dips folder', function () {
      it('should be rejected with error "dip doesn\'t exist"', function () {
        return expect(packages.getPackage('test', 'dip')).to.eventually.be.rejectedWith('dip doesn\'t exist');
      });
    });
  });

  describe('get by type', function () {
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

    describe('with valid type', function () {
      describe('with no packages in folder', function () {
        it('should eventually be empty array', function () {
          return expect(packages.getByType('dip')).to.eventually.be.empty.array;
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
    });

    describe('with non-valid type', function () {
      it('should be rejected with TypeError', function () {
        return expect(packages.getByType('test')).to.eventually.be.rejectedWith(TypeError);
      });
    });
  });

  describe('get dip', function () {
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

  describe('get taco', function () {
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

    describe('with valid taco name', function () {
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
        return expect(packages.getTaco('test')).to.eventually.be.an.object;
      });
    });

    describe('with non-valid taco name', function () {
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
        return expect(packages.getTaco('test')).to.eventually.to.have.property('config', null);
      });
    });
  });
});