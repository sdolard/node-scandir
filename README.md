node-scandir [![Build Status](https://travis-ci.org/sdolard/node-scandir.png?branch=master)](https://travis-ci.org/sdolard/node-scandir)
A lib and a cli that returns filepath list contains in dirs
============

* http://nodejs.org

# Installation with npm

```
[sudo] npm install [-g] scandir
```

# Usage
## CLI

```
  Usage: scandir [options] [command]

  Commands:

    *                      Directory to scan

  Options:

    -h, --help                                  output usage information
    -V, --version                               output the version number
    -r, --recursive                             scan dir recursive
    -w, --wildcard <wildcard>                   wildcard
    -e, --expression <regexp>                   regular expression
    -i, --insensitive                           case insensitive. Default to false
    -g, --greaterthan <size[B|kB|MB|GB|TB|EB]>  return files greater than size (Bytes)
    -l, --lowerthan <size[B|kB|MB|GB|TB|EB]>    return files lower than size (Bytes)
    -s, --showbrokenlink                        show broken symbolic link
    -R, --reporter <cli,json>                   default to cli
    -d, --debug

```

## LIB
### ScanDir ctor
```
    /**
    * @class
    * @public
    * @params [{Object}] config
    * @params [{Booleab}] config.debug. Defautl false
    * @event file({String} filePath, {Stats} stats)
    * @event end({Number} totalCount, {Number} totalSize}) > scan finished
    * @event error({Error} err)
    */

```

### ScanDir.prototype.scan
```
    /**
    * @method
    * @public
    * @params <{object}> config
    * @params <{string}> config.dir
    * @params [{boolean}]config.recursive. Default to true.
    * @params [{boolean}]config.insensitive. Default to false. Only available with String filter
    * @params [{RegExp|String|undefined}] config.filter. String === exact match
    * @params [{Number}] config.greaterthan. Bytes value
    * @params [{Number}] config.lowerthan. Bytes value
    * @params [{boolean}]config.showbrokenlink. Default to false.
    */
    ScanDir.prototype.scan

```

### Basic example

```
var scandir = require('../lib/scandir').create();

scandir.on('file', function(file, stats) {
	console.log(file + ' ' +  stats.size);
});

scandir.on('error', function(err){
	console.error(err);
});

scandir.on('end', function(){
	console.log('Done');
});

scandir.scan({
	dir: '.',
	recursive: true,
	filter: /.*/
});

```
