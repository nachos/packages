'use strict';

var nachosHome = require('nachos-home');
var nachosConfig = require('nachos-config');
var path = require('path');
var fs = require('fs');
var jf = require('jsonfile');
var _ = require('lodash');
var Q = require('q');
var debug = require('debug')('nachosPackages');

var typeFolder = {
  taco: 'tacos',
  dip: 'dips'
};

/**
 * Nacho package management
 * @constructor
 */
function Packages() {
}

/**
 * Available types
 * @type {Array}
 */
Packages.TYPES = Object.keys(typeFolder);

Packages.prototype.Packages = Packages;

/**
 * Getting packages folder
 * @returns {Q.promise} A promise with resolved / rejected data
 * @private
 */
Packages.prototype._getPackagesFolder = function () {
  var self = this;

  if (self._packagesFolder) {
    debug('returning packages folder from local cache: %s', self._packagesFolder);

    return Q.resolve(self._packagesFolder);
  }

  return nachosConfig.get()
    .then(function (config) {
      debug('checking if packages path is in config file');
      self._packagesFolder = config.packages || nachosHome('packages');

      debug(config.packages ? 'set local cache to the packages path from config' :
        'set local cache to the packages path from nachos home');

      return self._packagesFolder;
    });
};

/**
 * Getting folder by package type
 * @param {string} type dip or taco
 * @returns {Q.promise} A promise with resolved / rejected data
 */
Packages.prototype.getFolderByType = function (type) {
  if (!typeFolder[type]) {
    debug('%s is invalid type', type);

    return Q.reject(new TypeError('%s is invalid', type));
  }

  return this._getPackagesFolder()
    .then(function (packagesFolder) {
      return path.join(packagesFolder, typeFolder[type]);
    });
};

/**
 * Searching the containing folder of a package
 * @param pkg Package to find
 * @returns {Q.promise} A promise with resolved / rejected data
 */
Packages.prototype.getFolderByPackage = function (pkg) {
  var self = this;

  var typesPromises = Packages.TYPES.map(function (type) {
    return self.getFolderByType(type);
  });

  return Q.all(typesPromises)
    .then(function (folders) {
      debug('%j -> all available folders to search \'%s\' in', folders, pkg);

      var folderPromises = folders.map(function (folder) {
        var packageFolder = path.join(folder, pkg);

        return Q.nfcall(fs.access, packageFolder)
          .then(function () {
            debug('%s exists in %s', pkg, folder);

            return folder;
          }, function (err) {
            if (err.code !== 'ENOENT') {
              debug(err);

              return Q.reject(err);
            }

            debug('can\'t find %s in %s', pkg, packageFolder);
          });
      });

      return Q.all(folderPromises);
    })
    .then(function (folders) {
      var first = _.first(_.compact(folders));

      if (!first) {
        debug('package %s not found', pkg);

        return Q.reject(new Error('package %s not found', pkg));
      }

      return Q.resolve(first);
    });
};

/**
 * Get a package by it's name and it's type
 * @param name Name of wanted package
 * @param type Type of wanted package
 * @returns {Q.promise} A promise with resolved / rejected data
 */
Packages.prototype.getPackage = function (name, type) {
  debug('getting package %s of type %s', name, type);

  return this.getFolderByType(type)
    .then(function (folder) {
      var pkgConfig = path.join(folder, name, 'nachos.json');
      var dirname = path.dirname(pkgConfig);

      debug('looking for package config at: %s', pkgConfig);

      return Q.nfcall(jf.readFile, pkgConfig)
        .then(function (config) {
          var pkgConfig = {path: dirname, config: config};

          debug('package config: %j', pkgConfig);

          return Q.resolve(pkgConfig);
        }, function (err) {
          if (err.code === 'ENOENT') {
            debug('can\'t find %s nachos.json', name);

            return Q.reject('nachos.json for ' + name + ' ' + type + ' doesn\'t exist in ' + dirname);
          }

          debug('got an error with code: %s', err.code);
          debug('err: %j', err);

          return Q.reject(err);
        });
    });
};

/**
 * Get all packages with a specific types
 * @param type The packages type
 * @param full Get package config data
 * @returns {Q.promise} A promise with resolved / rejected data
 */
Packages.prototype.getByType = function (type, full) {
  var self = this;

  debug('getting all packages with \'%s\' type', type);

  return self.getFolderByType(type)
    .then(function (folderByType) {
      debug('looking for packages in %s', folderByType);

      return Q.nfcall(fs.readdir, folderByType)
        .then(function (files) {
          var filePromises = files.map(function (file) {
            return Q.nfcall(fs.stat, path.join(folderByType, file))
              .then(function (stats) {
                if (stats.isDirectory()) {
                  debug('%s is a directory', file);

                  return file;
                }

                debug('%s is not a directory', file);

                return null;
              });
          });

          return Q.all(filePromises);
        }, function (err) {
          if (err.code === 'ENOENT') {
            debug('can\'t find %s folder', folderByType);

            return Q.resolve([]);
          }

          debug('got an error with code: %s', err.code);
          debug('err: %j', err);

          return Q.reject(err);
        })
        .then(function (folders) {
          folders = _.compact(folders);
          debug('%d folders found: ', folders.length);
          debug(folders);

          var folerPromises = folders.map(function (folder) {
            var config = {
              name: folder,
              path: path.join(folderByType, folder)
            };

            if (!full) {
              debug('config for file %s: %j', folder, config);

              return config;
            }

            return self.getPackage(config.name, type)
              .then(function (innerConfig) {
                config.config = innerConfig.config;
                debug('full config for file %s: %j', folder, config);

                return config;
              });
          });

          return Q.all(folerPromises);
        });
    });
};

/**
 * Get a specific dip
 * @param name Name of the dip
 * @returns {Q.promise} A promise with resolved / rejected data
 */
Packages.prototype.getDip = function (name) {
  return this.getPackage(name, 'dip');
};

/**
 * Get a specific taco
 * @param name Name of the taco
 * @returns {Q.promise} A promise with resolved / rejected data
 */
Packages.prototype.getTaco = function (name) {
  return this.getPackage(name, 'taco');
};

/**
 * Getting all packages of every type
 * @param full Get package config data
 * @returns {Q.promise} A promise with resolved / rejected data
 */
Packages.prototype.getAll = function (full) {
  var self = this;
  var allPackages = {};

  var typesPromises = Packages.TYPES.map(function (type) {
    return self.getByType(type, full)
      .then(function (packages) {
        debug('got %s for type %s', packages, type);

        allPackages[type] = packages;
      });
  });

  return Q.all(typesPromises)
    .then(function () {
      debug('all packages of all types: %j', allPackages);

      return allPackages;
    });
};

module.exports = new Packages();