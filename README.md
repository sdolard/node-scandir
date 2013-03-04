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

    -h, --help                 output usage information
    -V, --version              output the version number
    -r, --recursive            Scan dir recursive
    -w, --wildcard <wildcard>  Wildcard
    -e, --expression <regexp>  Regular expression
    -i, --insensitive          Case insensitive. Default to false
    -d, --debug

```

## LIB


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
