/*jslint  node: true */
var
util = require('util'),
fs = require('fs'),
path = require('path'),
vm = require('vm'),
libutil = require('./libutil'),
scandir = require('./scandir'),
ansi = require('ansi'),
cursor = ansi(process.stderr),

scandirApp = (function() {

	function ScandirApp() {
		if (!this.argvInit()){
			return;
		}

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
			media: this.media,
			stopOnError: this.stopOnError
		});
	}

	ScandirApp.prototype.argvInit = function() {
		/*jslint stupid: true */
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
			.option('-s, --stoponerror', 'stop scan on first error. Default to false')
			.option('-R, --reporter <cli,json>', 'default to cli')
			.option('-d, --debug')
			.option('-L, --displayplugins', 'Display available plugins')
			.option('-p, --plugin <plugin name>', 'Ex: -p video/vlc-convert')
			.option('-H, --displaypluginoptions', 'Ex: -p video/vlc-convert -H')
			.option('-o, --pluginoptions <options>', 'Ex: -o "vc: \'VP80\', vb: 2000, ab: 44"');

		this.program.parse(process.argv);
		this.dir = '.';
		if (this.program.args.length > 0) {
			this.dir = this.program.args[0];
		}

		this.debug = this.program.debug;
		this.recursive = this.program.recursive === true;
		this.stopOnError = this.program.stoponerror === true;
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

		if (this.displayPluginList()) {
			return false;
		}

		return true;
	};

	ScandirApp.prototype.displayPluginList = function(){
		if (!this.program.displayplugins) {
			return false;
		}
		var
		s = scandir.create(),
		pluginDir = util.format('%s/plugins/', __dirname);
		s.on('file', function(file){
			console.log(file.replace(pluginDir, '').replace(/\.js$/,''));
		}.bind(this));
		s.scan({
			dir: pluginDir,
			recursive: true
		});
		return true;
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
			return this.exit('Invalid reporter: ' + e.message);
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

	ScandirApp.prototype.onFile = function(file, stats, match){
		if (this.reporter.onFile){
			this.reporter.onFile(file, stats, match);
		}

		// plugin
		if (this.plugin) {
			this.plugin.addFile(file, stats, match);
		}
	};

	ScandirApp.prototype.onError = function(err){
		if (err.code === 'EINVALIDDIR') {
			return this.exit('No directory defined');
		}
		if (err.code === 'ESIZERANGE') {
			return this.exit(err.message);
		}

		if (this.reporter.onError) {
			this.reporter.onError(err, this.debug);
		} else {
			console.error(err);
		}
	};

	ScandirApp.prototype.onEnd = function(totalCount, totalSize){
		if (this.reporter.onEnd) {
			this.reporter.onEnd(totalCount, totalSize);
		}
		// plugin
		if (this.plugin) {
			this.plugin.run(totalCount, totalSize);
		}
	};

	ScandirApp.prototype.exit = function(message) {
		cursor.red();
		console.error(message);
		cursor.reset();
		process.exit(1);
	};

	return new ScandirApp();
}());