var nachosHome = require('nachos-home');
var nachosConfig = require('nachos-config')();
var path = require('path');
var fs = require('fs');
var jf = require('jsonfile');
var async = require('async');

var typeFolder = {
  taco: 'tacos',
  dip: 'dips'
};

function Packages () {}

Packages.TYPES = Object.keys(typeFolder);

Packages.prototype.getFolderByType = function (type, cb) {
  var self = this;

  if (self._packagesFolder) {
    return cb(null, self._packagesFolder);
  }

  nachosConfig.get(function (err, config) {
    if (err) {
      return cb(err);
    }

    self._packagesFolder =  path.join(config.packages || nachosHome('packages'), typeFolder[type]);
    cb(null, self._packagesFolder);
  });
};

Packages.prototype.getFolderByPackage = function (pkg, cb) {
  async.map(Packages.TYPES, this.getFolderByType, function(err, folders) {
    if (err) {
      return cb(err);
    }

    async.detect(folders, fs.exists, function(result){
      cb(null, result);
    });
  });
};

Packages.prototype.getPackage = function (name, type, callback) {
  this.getFolderByType(type, function (err, folder) {
    if (err) {
      return callback(err);
    }

    var pkgConfig = path.join(folder, name, 'nachos.json');

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
  });
};

Packages.prototype.getByType = function (type, full, callback) {
  var self = this;

  if (typeof full === "function") {
    callback = full;
    full = false;
  }

  self.getFolderByType(type, function (err, folderByType) {
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

};

Packages.prototype.getDip = function (name, callback) {
  this.getPackage(name, 'dip', callback);
};

Packages.prototype.getTaco = function (name, callback) {
  this.getPackage(name, 'taco', callback);
};

Packages.prototype.getAll = function (full, callback) {
  var self = this;
  if (typeof full === "function") {
    callback = full;
    full = false;
  }

  var returnVal = {};

  async.each(Packages.TYPES, function (type, typesCb) {
    self.getByType(type, full, function (err, packages) {
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

module.exports = Packages;