node-scandir [![Build Status](https://travis-ci.org/sdolard/node-scandir.png?branch=master)](https://travis-ci.org/sdolard/node-scandir)[![Build Dependency](https://david-dm.org/sdolard/node-scandir.png)](https://david-dm.org/sdolard/node-scandir)
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
  Usage: scandir [options] <directory>

  Options:

    -h, --help                                  output usage information
    -V, --version                               output the version number
    -r, --recursive                             scan dir recursive
    -w, --wildcard <wildcard>                   wildcard
    -e, --expression <regexp>                   regular expression
    -m, --media <media>                         mime type media: application|audio|chemical|image|message|model|text|video|x-conference
    -i, --insensitive                           case insensitive. Default to false
    -g, --greaterthan <size[B|kB|MB|GB|TB|EB]>  return files greater than size (Bytes)
    -l, --lowerthan <size[B|kB|MB|GB|TB|EB]>    return files lower than size (Bytes)
    -s, --stoponerror                           stop scan on first error. Default to false
    -R, --reporter <cli,json>                   default to cli
    -d, --debug
    -L, --displayplugins                        Display available plugins
    -p, --plugin <plugin name>                  Ex: -p video/vlc-convert
    -H, --displaypluginoptions                  Ex: -p video/vlc-convert -H
    -o, --pluginoptions <options>               Ex: -o "vc: 'VP80', vb: 2000, ab: 44"

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
    * @params [{Number}] config.greaterthan. Bytes value. Min value 0.
    * @params [{Number}] config.lowerthan. Bytes value. Min value 1.
    * @params [{string}]config.media.
    * @params [{boolean}]config.stopOnError. Default to false.
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
