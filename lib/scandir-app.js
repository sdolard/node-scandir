var
util = require('util'),
fs = require('fs'),
path = require('path'),
vm = require('vm'),
libutil = require('./libutil'),
scandir = require('./scandir'),

scandirApp = (function() {

	function ScandirApp() {
		this.argvInit();

		this.scandir = scandir.create({
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
			showbrokenlink: this.showbrokenlink,
			media: this.media
		});
	}

	ScandirApp.prototype.argvInit = function() {
		this.program = require('commander');

		this.program
			.version(JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'))).version)
			.usage('[options] <directory>')
			.option('-r, --recursive', 'scan dir recursive')
			.option('-w, --wildcard <wildcard>', 'wildcard')
			.option('-e, --expression <regexp>', 'regular expression')
			.option('-m, --media <media>', 'mime type media: ' + scandir.MEDIA.join('|'))
			.option('-i, --insensitive', 'case insensitive. Default to false')
			.option('-g, --greaterthan <size[B|kB|MB|GB|TB|EB]>', 'return files greater than size (Bytes)', libutil.stringToBytes)
			.option('-l, --lowerthan <size[B|kB|MB|GB|TB|EB]>', 'return files lower than size (Bytes)', libutil.stringToBytes)
			.option('-s, --showbrokenlink', 'show broken symbolic link')
			.option('-R, --reporter <cli,json>', 'default to cli')
			.option('-d, --debug')
			.option('-p, --plugin <plugin name>', 'Ex: -p video/vlc-encode-to-webm')
			.option('-H, --displaypluginoptions', 'Ex: -p video/vlc-encode-to-webm -H')
			.option('-o, --pluginoptions <options>', 'Ex: -o "vb: 2000, ab: 44"');

		this.program.parse(process.argv);
		if (this.program.args) {
			this.dir = this.program.args[0];
		}

		this.debug = this.program.debug;
		this.recursive = this.program.recursive === true;
		this.showbrokenlink = this.program.showbrokenlink === true;
		this.getFilter();

		this.greaterthan = this.program.greaterthan;
		if (this.greaterthan === -1) {
			return this.exit('Invalid greaterthan value');
		}
		this.lowerthan = this.program.lowerthan;
		if (this.lowerthan === -1) {
			return this.exit('Invalid lowerthan value');
		}

		this.getReporter();

		this.getMedia();

		this.getPlugin();
	};

	ScandirApp.prototype.getReporter = function(){
		this.reporter = this.program.reporter || 'cli';
		try {
			this.reporter = require(util.format('%s/reporter/%s', __dirname, this.reporter));
			if (!this.reporter.init) {
				return;
			}
			this.reporter.init();
		}catch(e){
			return this.exit('Invalid reporter');
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

	ScandirApp.prototype.getMedia = function(){
		this.media = this.program.media;
		if (!this.media) {
			return;
		}
		if (scandir.MEDIA.indexOf(this.media) === -1) {
			return this.exit('Invalid media');
		}
	};

	ScandirApp.prototype.getPlugin = function(){
		var filepath;

		this.plugin = this.program.plugin;
		if (!this.plugin) {
			return;
		}
		try {
			filepath = util.format('%s/plugins/%s', __dirname, this.plugin);
			this.plugin = require(filepath).create({
				verbose: this.debug
			});
		}catch(e){
			switch(e.code) {
			case 'EPLATFORM':
			case 'EREQUIREMENT':
				console.error('Plugin error: %s', e.message);
				break;
			default:
				console.error('Plugin error');
				console.error(e.stack);
			}
			return process.exit(1);
		}

		if (this.program.displaypluginoptions) {
			this.plugin.outputSupportedOptionsHelp();
			process.exit(0);
			return;
		}
		this.getPluginOptions();
	};

	ScandirApp.prototype.getPluginOptions = function() {
		var
		sandbox = {},
		UnsupportedOptions;
		this.pluginOptions = this.program.pluginoptions;
		if (this.program.pluginoptions === undefined) {
			return;
		}
		//console.log('this.pluginOptions (txt): ' + this.pluginOptions);
		this.pluginOptions = 'options = {' + this.pluginOptions + '}';

		try {
			vm.runInNewContext(this.pluginOptions, sandbox);
		} catch(e) {
			return this.exit('Aborting: pluginoptions format is not valid.');
		}
		//console.log('this.pluginOptions (js): %j', sandbox.options);
		UnsupportedOptions = this.plugin.setOptions(sandbox.options);
		if (Object.keys(UnsupportedOptions).length > 0) {
			return this.exit('Aborting');
		}

	};

	ScandirApp.prototype.onFile = function(file, stats){
		if (this.reporter.onFile){
			this.reporter.onFile(file, stats);
		}

		// plugin
		if (this.plugin) {
			this.plugin.onScanFile(file, stats);
		}
	};

	ScandirApp.prototype.onError = function(err){
		if (err.code === 'ENOENT') {
			return this.exit(util.format('Path not found: "%s"', err.path));
		}
		if (err.code === 'EINVALIDDIR') {
			return this.exit('No directory defined');
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
		if (this.reporter.onEnd) {
			this.reporter.onEnd(totalCount, totalSize);
		}
		// plugin
		if (this.plugin) {
			this.plugin.onScanEnd(totalCount, totalSize);
		}
	};

	ScandirApp.prototype.exit = function(message) {
		console.error('!!! ' + message);
		process.exit(1);
	};

	return new ScandirApp();
}());