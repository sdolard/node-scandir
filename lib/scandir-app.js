var
util = require('util'),
fs = require('fs'),
path = require('path'),

scandirApp = (function() {

	function ScandirApp() {
		this.argvInit();

		this.scandir = require('./scandir').create({
			debug: this.debug
		});

		this.scandir.on('file', this.onFile.bind(this));
		this.scandir.on('error', this.onError.bind(this));
		this.scandir.on('end', this.onEnd.bind(this));

		this.scandir.scan({
			dir: this.dir,
			recursive: this.recursive,
			filter: this.filter,
			greaterthan: this.greaterthan,
			lowerthan: this.lowerthan,
			showbrokenlink: this.showbrokenlink
		});
	}

	ScandirApp.prototype.argvInit = function() {
		this.program = require('commander');


		this.program
			.version(JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'))).version)
			.option('-r, --recursive', 'Scan dir recursive')
			.option('-w, --wildcard <wildcard>', 'Wildcard')
			.option('-e, --expression <regexp>', 'Regular expression')
			.option('-i, --insensitive', 'Case insensitive. Default to false')
			.option('-g, --greaterthan <size[B|kB|MB|GB|TB|EB]>', 'Return files greater than size (Bytes)', this.stringToBytes.bind(this))
			.option('-l, --lowerthan <size[B|kB|MB|GB|TB|EB]>', 'Return files lower than size (Bytes)', this.stringToBytes.bind(this))
			.option('-s, --showbrokenlink', 'Show broken symbolic link')
			.option('-d, --debug');

		this.program
			.command('*')
			.description('Directory to scan')
			.action(function(dir){
				this.dir = dir;
			}.bind(this));

		this.program.parse(process.argv);

		this.debug = this.program.debug;
		this.recursive = this.program.recursive === true;
		this.showbrokenlink = this.program.showbrokenlink === true;
		this.getFilter();

		this.greaterthan = this.program.greaterthan;
		this.lowerthan = this.program.lowerthan;
	};

	ScandirApp.prototype.getFilter = function(){
		var wildcard;
		if (this.program.expression) {
			try {
				this.filter = new RegExp(this.program.expression, this.program.insensitive ? "i" :"");
			} catch(e) {
				console.error(e.message);
				process.exit(1);
			}
			return;
		}
		if (this.program.wildcard) {
			/*
			\x5c >  "\"
			\x5e >  "^"
			\x24 >  "$"
			\x2b >  "+"
			\x2e >  "."
			\x28 >  "("
			\x29 >  ")"
			\x5b >  "["
			\x5d >  "]"
			\x7c >  "|"
			\x7b >  "{"
			\x7d >  "}"
			\x2d >  "-"
			*/
			wildcard = this.program.wildcard.
				replace(/([\x5c\x5e\x24\x2b\x2e\x28\x29\x5b\x5d\x7c\x7b\x7d\x2d])/g, "\\$1").
				replace(/\*/g, ".*").
				replace(/\?/g, ".");

			try {
				this.filter = new RegExp(wildcard, this.program.insensitive ? "i" :"");
			} catch(er) {
				console.error(er.message);
				process.exit(1);
			}
		}
	};

	ScandirApp.prototype.RE_BYTES_OPTIONS = /(\d+\.?\d*)(.*)/;

	ScandirApp.prototype.CONVERT = {
		'B' :                        1,
		'kB':                     1000,
		'MB':                1000*1000,
		'GB':           1000*1000*1000,
		'TB':      1000*1000*1000*1000,
		'EB': 1000*1000*1000*1000*1000
	};

	/**
	* @returns {number} bytes if conv is ok (-1 if error)
	*/
	ScandirApp.prototype.stringToBytes = function(value){
		var
		match = value.match(this.RE_BYTES_OPTIONS),
		unit;
		if (match === null) {
			return -1;
		}
		unit = match[2];
		if (!unit) {
			return match[1];
		}
		if (!this.CONVERT.hasOwnProperty(unit)) {
			return -1;
		}
		return match[1] * this.CONVERT[unit];
	};

	ScandirApp.prototype.bytesToHuman = function(bytes, si, precision){
		precision = precision === undefined ? 1 : precision;

		var
		unit = si ? 1000 : 1024,
		exp,
		pre;

		if (bytes < unit) {
			return bytes + ' B';
		}
		exp = (Math.log(bytes) / Math.log(unit)).toFixed();
		pre = (si ? "kMGTPE" : "KMGTPE").charAt(exp-1) + (si ? "" : "i");
		return util.format("%s %sB", (bytes / Math.pow(unit, exp)).toFixed(precision), pre);
	};

	ScandirApp.prototype.onFile = function(file, stats){
		console.log(util.format('%s, %s', file, this.bytesToHuman(stats.size, true)));
	};

	ScandirApp.prototype.onError = function(err){
		if (err.code === 'ENOENT') {
			return this.helpExit(util.format('Path not found: "%s"', err.path));
		}
		if (err.code === 'EINVALIDDIR') {
			return this.helpExit('No directory defined');
		}
		if (err.code === 'EACCES') {
			return console.error(util.format('Acces error: "%s"', err.path));
		}
		if (err.code === 'EBROKENLINK') {
			return console.error(err.message);
		}
		if (err.code === 'ESIZERANGE') {
			return console.error(err.message);
		}
		console.error(err);
	};

	ScandirApp.prototype.onEnd = function(){
		//console.log('Done');
	};

	ScandirApp.prototype.helpExit = function(message) {
		console.error('!!! ' + message);
		this.program.outputHelp();
		process.exit(1);
	};

	return new ScandirApp();
}());