var
util = require('util'),
fs = require('fs'),
path = require('path'),
libutil = require('./libutil'),

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
			.option('-r, --recursive', 'scan dir recursive')
			.option('-w, --wildcard <wildcard>', 'wildcard')
			.option('-e, --expression <regexp>', 'regular expression')
			.option('-i, --insensitive', 'case insensitive. Default to false')
			.option('-g, --greaterthan <size[B|kB|MB|GB|TB|EB]>', 'return files greater than size (Bytes)', libutil.stringToBytes)
			.option('-l, --lowerthan <size[B|kB|MB|GB|TB|EB]>', 'return files lower than size (Bytes)', libutil.stringToBytes)
			.option('-s, --showbrokenlink', 'show broken symbolic link')
			.option('-R, --reporter <cli,json>', 'default to cli')
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
		if (this.greaterthan === -1) {
			return this.helpExit('Invalid greaterthan value');
		}
		this.lowerthan = this.program.lowerthan;
		if (this.lowerthan === -1) {
			return this.helpExit('Invalid lowerthan value');
		}

		this.getReporter();
	};

	ScandirApp.prototype.getReporter = function(){
		this.reporter = this.program.reporter || 'cli';
		try {
			this.reporter = require(util.format('%s/reporter/%s', __dirname, this.reporter));	
			if (!this.reporter.hasOwnProperty('onFile') ||
				!this.reporter.hasOwnProperty('onEnd') ||
				!this.reporter.hasOwnProperty('init')){
				return this.helpExit('Invalid reporter');
			}
			this.reporter.init();
		}catch(e){
			return this.helpExit('Invalid reporter');
		}
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

	ScandirApp.prototype.onFile = function(file, stats){
		this.reporter.onFile(file, stats);
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

	ScandirApp.prototype.onEnd = function(totalCount, totalSize){
		this.reporter.onEnd(totalCount, totalSize);
	};

	ScandirApp.prototype.helpExit = function(message) {
		console.error('!!! ' + message);
		this.program.outputHelp();
		process.exit(1);
	};

	return new ScandirApp();
}());