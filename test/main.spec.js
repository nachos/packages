'use strict';

var chai = require('chai');
var expect = chai.expect;

chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));

describe('packages', function () {
  var packages = require('../lib');

  describe('types', function () {
    it('should return list of types', function () {
      expect(packages.Packages.TYPES).to.have.length(3);
    });
  });

  describe('exports', function () {
    it('should expose valid exports', function () {
      expect(packages.getFolderByType).to.be.a('function');
      expect(packages.getFolderByPackage).to.be.a('function');
      expect(packages.getPackage).to.be.a('function');
      expect(packages.getByType).to.be.a('function');
      expect(packages.getDip).to.be.a('function');
      expect(packages.getTaco).to.be.a('function');
      expect(packages.getBurrito).to.be.a('function');
      expect(packages.getAll).to.be.a('function');
    });
  });
});