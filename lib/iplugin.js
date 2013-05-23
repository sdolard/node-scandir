//cvlc-encdode-to-webm
//#!/bin/bash

//INFILE=$1
//OUTFILE="$INFILE".webm

//cvlc --sout "#transcode{vcodec=VP80,vb=2000,scale=0,acodec=vorb,ab=128,channels=2,samplerate=44100}:std{access=file,mux=webm,dst='$OUTFILE'}" $INFILE vlc://quit

var
path = require('path'),
fs = require('fs'),
util = require('util'),
exec = require('child_process').exec;

exports.IPlugin = (function (){

	var v = 1, vv=2;

	function IPlugin (config) {
		this._pluginFormat = 1;

		config = config || {};
		this.deleteInFileOnSuccess = config.deleteInFileOnSuccess === true; // default false
		this._verbose = config.verbose === undefined ? 0 : config.verbose;

		this.pluginName = 'iplugin';
		this.pluginVersion = '0.1'; // TODO
		this._files = [];
		this._filepath = '';
		this._platform = this.getPlatformRequirement();
		this._resolveBin();
		this._onScanEndCallCount = 0;
	}

	// TODO: support args by platform
	IPlugin.prototype.getPlatformRequirement = function(){
		console.error('IPlugin.prototype.setPlatformRequirement MUST BE overloaded');
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

	IPlugin.prototype._resolveBin = function(){
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

	// todo check if out file not already exists
	IPlugin.prototype.getOutFile = function(file) {
		console.error('IPlugin.prototype.getOutFile MUST BE overloaded');
		var
		dirname = path.dirname(file),
		basename = path.basename(file, path.extname(file)) + '-NEW' + path.extname(file);
		return path.resolve(dirname, basename);
	};

	IPlugin.prototype.getCommand = function(/*file*/) {
		console.error('IPlugin.prototype.getCommand MUST BE overloaded');
		return this._filepath;
	};

	IPlugin.prototype._execOn = function(config) {
		var
		outFile = this.getOutFile(config.file),
		command = this.getCommand(config.file);

		this.log(v, util.format('%s# exec: "%s"', this.pluginName, command));

		exec(command, {
			env: process.env
		},function (error, stdout, stderr) {
			if (error !== null) {
				this.log(v, util.format('%s# success (%s>)', this.pluginName, config.file, outFile));
				try{
					fs.unlinkSync(outFile);
				} catch(e){
					this.log(v, util.format('%s# deleting %s failed', this.pluginName, outFile));
					this._eexception(e);
				}
				this.log(vv, util.format('%s# stdout: %s', this.pluginName, stdout));
				this.log(vv, util.format('%s# stderr: %s', this.pluginName, stderr));
				this.log(vv, '%s# exec error: ' + error);
			} else {
				console.log('%s# success ("%s" > "%s")', this.pluginName, config.file, outFile);
				if (this._deleteInFileOnSuccess) {
					try{
						fs.unlinkSync(config.file);
						console.log('%s# deleted ("%s")', this.pluginName, config.file);
					} catch(e){
						this.log(vv, util.format('%s# failed deleting "%s"', this.pluginName, config.file));
						this._eexception(e);
					}
				}
			}
			config.done();
		}.bind(this));
	};


	/* To check if file has the required format
	*/
	IPlugin.prototype.isFileValid = function(/*file*/) {
		console.error('IPlugin.prototype.isFileValid MUST BE overloaded');
		return true;
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
		var file = this._files.shift();
		console.log('Running %s plugin on %s...', this.pluginName, file.file);
		this._execOn({
			file: file.file,
			stats: file.stats,
			done: function() {
				this.onScanEnd();
			}.bind(this)
		});
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

	IPlugin.prototype.log = function(level, msg){
		if (level > this._verbose) {
			return;
		}
		console.error(msg);
	};

	return IPlugin;
}());
