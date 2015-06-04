var nachosHome = require('nachos-home');
var SettingsFile = require('nachos-settings-file');
var path = require('path');
var fs = require('fs');
var jf = require('jsonfile');
var async = require('async');

var typeFolder = {
  taco: 'tacos',
  dip: 'dips'
};

var types = Object.keys(typeFolder);
var nachosConfig = new SettingsFile('nachos').getSync();

var getFolderByType = function (type) {
  if (nachosConfig.packagesPath) {
    return path.join(nachosConfig.packagesPath, 'packages', typeFolder[type]);
  } else {
    return nachosHome('packages', typeFolder[type]);
  }
};

var getPackage = function (name, type, callback) {
  var pkgConfig = path.join(getFolderByType(type), name, 'nachos.json');

  var dirname = path.dirname(pkgConfig);

  fs.exists(pkgConfig, function (exists) {
    if (!exists) {
      return callback('nachos.json for ' + name + ' ' + type + ' doesn\'t exist in ' + dirname);
    }

    jf.readFile(pkgConfig, function (err, config) {
      if (err) {
        return callback('error reading nachos.json file');
      }

      callback(null, {path: dirname, config: config});
    });
  });
};

var getByType = function (type, full, callback) {
  if (typeof full === "function") {
    callback = full;
    full = false;
  }

  var folderByType = getFolderByType(type);
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

        getPackage(config.name, type, function (err, innerConfig) {
          if (err) {
            return cb(err);
          }

          config.config = innerConfig.config;

          cb(null, config);
        });

      }, callback);
    });
  });
};

var getDip = function (name, callback) {
  getPackage(name, 'dip', callback);
};

var getTaco = function (name, callback) {
  getPackage(name, 'taco', callback);
};

var getAll = function (full, callback) {
  if (typeof full === "function") {
    callback = full;
    full = false;
  }

  var returnVal = {};

  async.each(types, function (type, typesCb) {
    getByType(type, full, function (err, packages) {
      if (err) {
        return typesCb(err);
      }

      returnVal[type] = packages;
      typesCb();
    });
  }, function (err) {
    callback(err, returnVal);
  });
};

module.exports = {
  types: types,
  getAll: getAll,
  getByType: getByType,
  getPackage: getPackage,
  getDip: getDip,
  getTaco: getTaco
};