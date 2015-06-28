'use strict';

var nachosHome = require('nachos-home');
var nachosConfig = require('nachos-config')();
var path = require('path');
var fs = require('fs');
var jf = require('jsonfile');
var async = require('async');
var _ = require('lodash');
var Q = require('q');
var debug = require('debug')('packages');

var typeFolder = {
  taco: 'tacos',
  dip: 'dips'
};

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

      return folders.map(function (folder) {
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
    })
    .then(Q.all)
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
  return this.getFolderByType(type)
    .then(function (folder) {
      var pkgConfig = path.join(folder, name, 'nachos.json');

      var dirname = path.dirname(pkgConfig);

      return Q.nfcall(jf.readFile, pkgConfig)
        .then(function (config) {
          return Q.resolve({path: dirname, config: config});
        }, function (err) {
          if (err.code === 'ENOENT') {
            return Q.reject('nachos.json for ' + name + ' ' + type + ' doesn\'t exist in ' + dirname);
          }
        });
    });
};

Packages.prototype.getByType = function (type, full, callback) {
  var self = this;

  if (typeof full === 'function') {
    callback = full;
    full = false;
  }

  self.getFolderByType(type, function (err, folderByType) {
    fs.exists(folderByType, function (folderExists) {
      if (!folderExists) {
        return callback(null, []);
      }

      fs.readdir(folderByType, function (err, files) {
        if (err) {
          return callback(err);
        }

        async.filter(files, function (file, cb) {
          fs.stat(path.join(folderByType, file), function (err, stats) {
            if (err) {
              return cb();
            }

            cb(stats.isDirectory());
          });
        }, function (folders) {
          async.map(folders, function (folder, cb) {
            var config = {
              name: folder,
              path: path.join(folderByType, folder)
            };

            if (!full) {
              return cb(null, config);
            }

            self.getPackage(config.name, type, function (err, innerConfig) {
              if (err) {
                return cb(err);
              }

              config.config = innerConfig.config;

              cb(null, config);
            });
          }, callback);
        });
      });
    });
  });
};

Packages.prototype.getDip = function (name, callback) {
  this.getPackage(name, 'dip', callback);
};

Packages.prototype.getTaco = function (name, callback) {
  this.getPackage(name, 'taco', callback);
};

Packages.prototype.getAll = function (full, callback) {
  var self = this;

  if (typeof full === 'function') {
    callback = full;
    full = false;
  }

  var returnVal = {};

  async.each(Packages.TYPES, function (type, typesCb) {
    debug('getting packages for type: %s', type);
    self.getByType(type, full, function (err, packages) {
      if (err) {
        return typesCb(err);
      }

      returnVal[type] = packages;
      typesCb();
    });
  }, function (err) {
    if (err) {
      return callback(err);
    }

    callback(null, returnVal);
  });
};

module.exports = new Packages();