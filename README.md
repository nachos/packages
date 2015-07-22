# packages

Manage all nachos packages

<table>
  <thead>
    <tr>
      <th>Linux</th>
      <th>OSX</th>
      <th>Windows</th>
      <th>Coverage</th>
      <th>Dependencies</th>
      <th>DevDependencies</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td colspan="2" align="center">
        <a href="https://travis-ci.org/nachos/packages"><img src="https://img.shields.io/travis/nachos/packages.svg?style=flat-square"></a>
      </td>
      <td align="center">
        <a href="https://ci.appveyor.com/project/nachos/packages"><img src="https://img.shields.io/appveyor/ci/nachos/packages.svg?style=flat-square"></a>
      </td>
      <td align="center">
<a href='https://coveralls.io/r/nachos/packages'><img src='https://img.shields.io/coveralls/nachos/packages.svg?style=flat-square' alt='Coverage Status' /></a>
      </td>
      <td align="center">
        <a href="https://david-dm.org/nachos/packages"><img src="https://img.shields.io/david/nachos/packages.svg?style=flat-square"></a>
      </td>
      <td align="center">
        <a href="https://david-dm.org/nachos/packages#info=devDependencies"><img src="https://img.shields.io/david/dev/nachos/packages.svg?style=flat-square"/></a>
      </td>
    </tr>
  </tbody>
</table>

## Have a problem? Come chat with us!
[![Join the chat at https://gitter.im/nachos/packages](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/nachos/packages?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

## Installation
``` bash
$ [sudo] npm install nachos-packages --save
```

## Examples
### Initialize
``` js
var packages = require('nachos-packages');
```

### Examples
#### TYPES
Returns the available packages types
``` js
var types = packages.Packages.TYPES;
```

#### getFolderByType(type)
Get folder by specific type
``` js
packages.getFolderByType('dip')
  .then(function (folder) {
    // ...
  });
```

#### getFolderByPackage(packageName)
Get folder by specific package
``` js
packages.getFolderByPackage('your-package')
  .then(function (folder) {
    // ...
  });
```

#### getPackage(packageName, type)
Get specific package by type
``` js
packages.getPackage('your-package', 'dip')
  .then(function (packageConfig) {
    /** packageConfig: 
        {
          path: 'path/to/your/package',
          config: { ... } // -> nachos.json of the package
        }
    */
  });
```

#### getByType(type, full [optional])
Get all packages with specific type
``` js
packages.getByType('dip')
  .then(function (packagesByType) {
    /** packagesByType:
        [
          {
            name: 'pkg1',
            path: 'path/to/your/package'
          },
          ...
        ]
    */
  });
  
// With 'full' option
packages.getByType('dip', true)
  .then(function (packagesByType) {
    /** packagesByType:
        [
          {
            name: 'pkg1',
            path: 'path/to/your/package',
            config: { ... } // -> nachos.json of the package
          },
          ...
        ]
    */
  });
```

#### getDip(dipName)
Get dip by name
``` js
packages.getDip('your-dip')
  .then(function (dipConfig) {
    /** dipConfig: 
        {
          path: 'path/to/your/dip',
          config: { ... } // -> nachos.json of the package
        }
    */
  });
```

#### getTaco(tacoName)
Get taco by its name
``` js
packages.getTaco('your-taco')
  .then(function (tacoConfig) {
    /** tacoConfig: 
        {
          path: 'path/to/your/taco',
          config: { ... } // -> nachos.json of the package
        }
    */
  });
```

#### getAll(full [optional])
Get all packages of all types
``` js
packages.getAll()
  .then(function (packages) {
    /** packages
        {
          dip:  [
                  {
                    name: 'pkg1',
                    path: 'path/to/your/package'
                  },
                  ...
                ],
          taco: [...]
        }
    */
  });
  
  
// With 'full' option
packages.getAll(true)
  .then(function (packages) {
    /** packages
        {
          dip:  [
                  {
                    name: 'pkg1',
                    path: 'path/to/your/package',
                    config: { ... } // -> nachos.json of the package
                  },
                  ...
                ],
          taco: [...]
        }
    */
  });
```


## Run Tests
``` bash
$ npm test
```

## License

[MIT](LICENSE)
