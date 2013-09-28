/*jslint node: true*/
//cvlc-encdode-to-webm
//#!/bin/bash

//INFILE=$1
//OUTFILE="$INFILE".webm

//cvlc --sout "#transcode{vcodec=VP80,vb=2000,scale=0,acodec=vorb,ab=128,channels=2,samplerate=44100}:std{access=file,mux=webm,dst='$OUTFILE'}" $INFILE vlc://quit

var
path = require('path'),
fs = require('fs'),
util = require('util'),
exec = require('child_process').exec,
IPlugin;

exports.IPlugin = IPlugin = (function (){

	/*
	* @config {object} config
	* <ul>
	* <li>{string} pluginName. Required</li>
	* <li>[{boolean} verbode] default false</li>
	* </ul>
	*/
	function IPlugin (config) {
		this._pluginFormat = 1;

		config = config || {};
		this._verbose = config.verbose === true; // default to false

		if (!this.pluginName) {
			this._eexception({
				code: 'EPLUGIN',
				message: 'pluginName option is required'
			});
		}

		this._files = [];
		this._onScanEndCallCount = 0;
		this.options = {};
	}

	/*
	* configure plugin options
	* @public
	* @returns {object} with invalid options if there is
	*/
	IPlugin.prototype.setOptions = function(options) {
		var
		unsupportedOptions = {},
		supportedOptions = this.getSupportedOptions();
		Object.keys(options).forEach(function(option) {
			if (!supportedOptions.hasOwnProperty(option)) {
				unsupportedOptions[option] = options[option];
				this.log('Unsupported option: %s', option);
				return;
			}
			this.options[option] = this.convertOption(option, options[option]);
			//this.log('%s: %s', option, options[option]);
		}.bind(this));
		return unsupportedOptions;
	};

	/*
	* Allow to convert an option value
	* @param {string} option name
	* @param {string} value option value
	*/
	IPlugin.prototype.convertOption = function(option, value){
		/*jslint unparam: true */
		return value;
	};

	/*
	* Can be overloaded to return plugin supported option
	* @returns {Object} supportedOptions
	* <ul>
	* <li>{string} option name: {string} description</li>
	* <li>...</li>
	* </ul>
	* Ex:
	*   return {
	*     "option": "description"
	*   };
	*/
	IPlugin.prototype.getSupportedOptions = function() {
		return {};
	};

	/*
	* Dump plugin supported options
	* @public
	*/
	IPlugin.prototype.outputSupportedOptionsHelp = function() {
		var
		options =  this.getSupportedOptions(),
		optionKeys = Object.keys(options);
		console.log('%s help:', this.pluginName);
		if (optionKeys.length === 0) {
			console.log('no option');
			return;
		}
		optionKeys.forEach(function(option) {
			console.log('  %s: %s', option, options[option]);
		}.bind(this));
	};


	/*
	* Check if "file" has the required format
	* @params {string} filepath
	* @returns {boolean} return true if filepath is valid
	*/
	IPlugin.prototype.isFileValid = function(/*filepath*/) {
		this._eexception({
			code: 'EINTERFACE',
			message: 'IPlugin.prototype.isFileValid MUST BE overloaded'
		});
	};

	/*
	* Called to do the plugin job on a file
	* @params {Object} config
	* <ul>
	* <li>{String} file</li>
	* <li>{object} stats. See http://nodejs.org/api/fs.html#fs_class_fs_stats</li>
	* <li>{function} done. To call when job is done</li>
	* </ul>
	*/
	IPlugin.prototype.runOnFile = function(config) {
		/*jslint unparam: true*/
		this._eexception({
			code: 'EINTERFACE',
			message: 'IPlugin.prototype.runOnFile MUST BE overloaded'
		});
	};

	/*
	* Add file to treat to plugin
	* @see isFileValid
	* @params {string} file. File path
	* @params {object} stats. See http://nodejs.org/api/fs.html#fs_class_fs_stats
	* @public
	*/
	IPlugin.prototype.addFile = function(file, stats){
		if (!this.isFileValid(file)){
			return;
		}
		this._files.push({
			file: file,
			stats: stats
		});
	};


	/*
	* Call to run plugin
	* @params {number} totalCount
	* @params {number} totalSize
	* @public
	*/
	IPlugin.prototype.run = function(/*totalCount, totalSize*/){
		if (this._files.length === 0) {
			return;
		}
		this._onScanEndCallCount++;
		var
		file = this._files.shift(),
		timeInMs = Date.now(),
		durationInMs = 0;
		this.log('Running on %s...', file.file);

		this.runOnFile({
			file: file.file,
			stats: file.stats,
			done: function(success, outFile) {
				success = success === true;
				outFile = outFile || "";
				durationInMs = Date.now() - timeInMs;
				this.onDone(success, file.file, file.stats, outFile, durationInMs, function(){
					this.run();
				}.bind(this));
			}.bind(this)
		});
	};

	/*
	* Called when after plugin was runned on a file
	* Can be overload. "next" must be called when finished
	* @params {boolean} success
	* @params {String} inFile
	* @params {Object} infileStats
	* @params {String} outFile
	* @params {Number} duration
	* @params {Function} next. Call to run plugin on next file.
	*/
	IPlugin.prototype.onDone = function(success, infile, infileStats, outfile, duration, next){
		/*jslint unparam: true*/
		next();
	};

	/**
	* @private
	*/
	IPlugin.prototype._eexception = function(exception) {
		var error;
		if (exception instanceof Error) {
			error = exception;
		} else {
			error = new Error(exception.message);
			Error.captureStackTrace(error, IPlugin.prototype._eexception); // we do not trace this function
			error.code = exception.code;
		}
		throw error;
	};

	IPlugin.prototype.debug = function(){
		if (!this._verbose) {
			return;
		}

		var
		args = arguments,
		v = parseInt((new Date()).getTime(), 10) + this.pluginName + ' # ';
		args[0] = args[0].replace('\n', '\n' + v);
		args[0] = v.concat(args[0]);

		console.error.apply(console, args);
	};

	IPlugin.prototype.log = function(){
		var
		args = arguments,
		v = this.pluginName + ' # ';
		args[0] = args[0].replace('\n', '\n' + v);
		args[0] = v.concat(args[0]);
		console.log.apply(console, args);
	};

	return IPlugin;
}());

exports.IExecPlugin = (function (){

	function IExecPlugin (config) {
		IPlugin.call(this, config);

		this._filepath = '';
		this._platform = this.getPlatformRequirement();
		this._resolveBin();
	}
	util.inherits(IExecPlugin, IPlugin);

	// TODO: support args by platform
	IExecPlugin.prototype.getPlatformRequirement = function(){
		this._eexception({
			code: 'EINTERFACE',
			message: 'IExecPlugin.prototype.setPlatformRequirement MUST BE overloaded'
		});
		return {
			'win32': {
				bin: 'dir',
				pathList: [
					process.env.PATH.split(path.delimiter)
				],
				install: 'nothing to install'
			},
			'darwin': {
				bin: 'ls',
				pathList: [
					process.env.PATH.split(path.delimiter)
				],
				install: 'nothing to install'
			},
			'linux':{
				bin: 'ls',
				pathList: process.env.PATH.split(path.delimiter),
				install:  'nothing to install'
			}
		};
	};

	IExecPlugin.prototype._resolveBin = function(){
		/*jslint stupid: true */
		var filepath, platform, i;

		// Supported platform ?
		if (!this._platform.hasOwnProperty(process.platform)) {
			this._eexception({
				message: 'Platform is not supported',
				code: 'EPLATFORM'
			});
		}

		// bin file path found ?
		platform = this._platform[process.platform];
		for (i = 0; i < platform.pathList.length; i++){
			filepath = path.resolve(platform.pathList[i], platform.bin);
			//console.log('filepath: %s', filepath);
			if (fs.existsSync(filepath)) {
				this._filepath = filepath;
				break;
			}
		}

		if (this._filepath === '') { // not found
			this._eexception({
				message: "\"" + platform.bin + '" is required.\nInstall it: ' + platform.install,
				code: 'EREQUIREMENT'
			});
		}
	};


	IExecPlugin.prototype.getCommand = function(/*file*/) {
		this._eexception({
			code: 'EINTERFACE',
			message: 'IExecPlugin.prototype.getCommand MUST BE overloaded'
		});
		return this._filepath;
	};



	// todo check if out file not already exists
	IExecPlugin.prototype.getOutFile = function(file) {
		this._eexception({
			code: 'EINTERFACE',
			message: 'IExecPlugin.prototype.getOutFile MUST BE overloaded'
		});

		var
		dirname = path.dirname(file),
		basename = path.basename(file, path.extname(file)) + '-NEW' + path.extname(file);
		return path.resolve(dirname, basename);
	};

	IExecPlugin.prototype.runOnFile = function(config) {
		var
		outFile = this.getOutFile(config.file),
		command = this.getCommand(config.file);

		this.debug('exec: "%s"', command);

		exec(command, {
			env: process.env
		},function (error, stdout, stderr) {
			/*jslint stupid: true */
			if (error !== null) {
				// error
				this.log('failed ("%s" > "%s")', config.file, outFile);
				if (fs.existsSync(outFile)) {
					try{
						fs.unlinkSync(outFile);
					} catch(e){
						this.debug('failed deleting "%s"', outFile);
						this._eexception(e);
					}
				}
				this.debug('stdout: "%s"', stdout);
				this.debug('stderr: "%s"', stderr);
				this.debug('exec error: ' + error);
				config.done(false);
				return;
			}
			this.debug('stdout: "%s"', stdout);
			this.debug('stderr: "%s"', stderr);

			// success
			console.log('success ("%s" > "%s")', config.file, outFile);
			config.done(true, outFile);
		}.bind(this));
	};

	return IExecPlugin;
}());
