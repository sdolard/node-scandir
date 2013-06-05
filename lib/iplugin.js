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

// TODO: IPlugin, IExecPlugin, INodePlugin

IPlugin = (function (){

	function IPlugin (config) {
		this._pluginFormat = 1;

		config = config || {};
		this._verbose = config.verbose === true; // default to false
		this.pluginName = 'iplugin';
		this.pluginVersion = '0.1'; // TODO
		this._files = [];
		this._onScanEndCallCount = 0;
		this.options = {};
	}

	/*
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
			this.options[option] = options[option];
			//this.log('%s: %s', option, options[option]);
		}.bind(this));
		return unsupportedOptions;
	};

	/*
	* @returns {Object} supportedOptions
	* Ex:
	*   return {
	*     "option": "description"
	*   };
	*/
	IPlugin.prototype.getSupportedOptions = function() {
		return {};
	};

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


	/* To check if file has the required format
	*/
	IPlugin.prototype.isFileValid = function(/*file*/) {
		this._eexception({
			code: 'EINTERFACE',
			message: 'IPlugin.prototype.isFileValid MUST BE overloaded'
		});
		return true;
	};

	IPlugin.prototype._run = function(/*file*/) {
		this._eexception({
			code: 'EINTERFACE',
			message: 'IPlugin.prototype._run MUST BE overloaded'
		});
	};

	IPlugin.prototype.onScanFile = function(file, stats){
		if (!this.isFileValid(file)){
			return;
		}
		this._files.push({
			file: file,
			stats: stats
		});
	};

	IPlugin.prototype.onScanEnd = function(/*totalCount, totalSize*/){
		if (this._files.length === 0) {
			return;
		}
		this._onScanEndCallCount++;
		var 
		file = this._files.shift(),
		timeInMs = Date.now(), 
                durationInMs = 0;
		this.log('Running on %s...', file.file);
		
		this._run({
			file: file.file,
			stats: file.stats,
			done: function(success, outFile) {
				durationInMs = Date.now() - timeInMs;
				this.onDone(success, file.file, file.stats, outFile, durationInMs, function(){
					this.onScanEnd();
				}.bind(this));
			}.bind(this)
		});
	};

	IPlugin.prototype.onDone = function(success, inFile, outFile, next){
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
		
		this.pluginName = 'iexecplugin';
		this._filepath = '';
		this._platform = this.getPlatformRequirement();
		this._resolveBin();
		this.options = {};
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
				message: this.defaultBin + ' is required.\nInstall it: ' + platform.install,
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

	IExecPlugin.prototype._run = function(config) {
		var
		outFile = this.getOutFile(config.file),
		command = this.getCommand(config.file);

		this.debug('exec: "%s"', command);

		exec(command, {
			env: process.env
		},function (error, stdout, stderr) {
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

			// success
			console.log('success ("%s" > "%s")', config.file, outFile);
			config.done(true, outFile);
		}.bind(this));
	};

	return IExecPlugin;
}());
