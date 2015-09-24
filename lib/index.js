'use strict';

var nachosHome = require('nachos-home');
var nachosConfig = require('nachos-config');
var path = require('path');
var fs = require('fs');
var jf = require('jsonfile');
var _ = require('lodash');
var Q = require('q');
var debug = require('debug')('nachosPackages');
var fsAccess = require('fs-access');

var typeFolder = {
  taco: 'tacos',
  dip: 'dips',
  burrito: 'burritos'
};

/**
 * Nacho package management
 *
 * @constructor
 */
function Packages() {
}

/**
 * Available types
 * @type {Array}
 */
Packages.TYPES = Object.keys(typeFolder);

/**
 * Expose the constructor
 * @type {Packages}
 */
Packages.prototype.Packages = Packages;

/**
 * Getting packages folder
 *
 * @returns {Q.promise} The folder of the package
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
 * Get package by its name and by its type
 *
 * @param {String} name Package name
 * @param {String} type Package type
 * @returns {Q.promise} The requested package
 * @private
 */
Packages.prototype._getPackageByType = function (name, type) {
  debug('getting package %s of type %s', name, type);

  return this.getFolderByType(type)
    .then(function (folder) {
      var pkgConfig = path.join(folder, name, 'nachos.json');
      var dirname = path.dirname(pkgConfig);

      debug('looking for package config at: %s', pkgConfig);

      return Q.nfcall(jf.readFile, pkgConfig)
        .then(function (config) {
          var pkgConfig = {
            path: dirname,
            config: config
          };

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
 * Finds package by its name from all packages
 *
 * @param {String} name Package name
 * @returns {Q.promise} The requested package
 * @private
 */
Packages.prototype._findPackageByName = function (name) {
  debug('getting package %s', name);

  var self = this;

  return self.getAll(true)
    .then(function (packages) {
      var result;

      debug('packages %j', packages);

      _.forEach(self.Packages.TYPES, function (type) {
        result = _.find(packages[type], function (pkg) {
          return pkg.name === name;
        });

        if (result) {
          result.type = type;
          debug('found package %j', result);
        }
      });

      if (!result) {
        debug('Could not find package named %s', name);

        return Q.reject('Could not find package named ' + name);
      }

      return result;
    });
};

/**
 * Getting folder by package type
 *
 * @param {String} type Type of package
 * @returns {Q.promise} The folder of the specified type
 */
Packages.prototype.getFolderByType = function (type) {
  if (!typeFolder[type]) {
    debug('%s is invalid type', type);

    return Q.reject(new TypeError(type + ' is invalid'));
  }

  return this._getPackagesFolder()
    .then(function (packagesFolder) {
      return path.join(packagesFolder, typeFolder[type]);
    });
};

/**
 * Searching the containing folder of a package
 *
 * @param {String} pkg Package to find
 * @returns {Q.promise} The folder of the specified package
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

        return Q.nfcall(fsAccess, packageFolder)
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
 * Get a package by its name or its name and its type
 *
 * @param {String} name Name of wanted package
 * @param {String} [type] Type of wanted package
 * @returns {Q.promise} The package requested
 */
Packages.prototype.getPackage = function (name, type) {
  var self = this;

  if (!type) {
    return self._findPackageByName(name);
  }

  return self._getPackageByType(name, type);
};

/**
 * Get all packages with a specific type
 *
 * @param {String} type The packages type
 * @param {Boolean} [full] Get package config data
 * @returns {Q.promise} All packages of the requested type
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
 *
 * @param {String} name Name of the dip
 * @returns {Q.promise} The config of the requested dip
 */
Packages.prototype.getDip = function (name) {
  return this.getPackage(name, 'dip');
};

/**
 * Get a specific taco
 *
 * @param {String} name Name of the taco
 * @returns {Q.promise} The config of the requested taco
 */
Packages.prototype.getTaco = function (name) {
  return this.getPackage(name, 'taco');
};

/**
 * Get a specific burrito
 *
 * @param {String} name Name of the burrito
 * @returns {Q.promise} The config of the requested burrito
 */
Packages.prototype.getBurrito = function (name) {
  return this.getPackage(name, 'burrito');
};

/**
 * Getting all packages of every type
 *
 * @param {Boolean} [full] Get package config data
 * @returns {Q.promise} All packages from all types
 */
Packages.prototype.getAll = function (full) {
  var self = this;

  var typesPromises = Packages.TYPES.map(function (type) {
    return self.getByType(type, full);
  });

  return Q.all(typesPromises)
    .then(function (typesArray) {
      debug('all packages of all types: %j', typesArray);

      return _.zipObject(Packages.TYPES, typesArray);
    });
};

module.exports = new Packages();