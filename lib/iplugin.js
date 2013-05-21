//cvlc-encdode-to-webm
//#!/bin/bash

//INFILE=$1
//OUTFILE="$INFILE".webm

//cvlc --sout "#transcode{vcodec=VP80,vb=2000,scale=0,acodec=vorb,ab=128,channels=2,samplerate=44100}:std{access=file,mux=webm,dst='$OUTFILE'}" $INFILE vlc://quit

var
path = require('path'),
fs = require('fs'),
exec = require('child_process').exec;

exports.IPlugin = (function (){

	function IPlugin (config) {
		this._pluginFormat = 1;

		config = config || {};
		this.deleteInFileOnSuccess = config.deleteInFileOnSuccess === true; // default false
		this.pluginName = 'iplugin';
		this.pluginVersion = '0.1'; // TODO

		this._files = [];
		this._filepath = '';

		this._platform = this.getPlatformRequirement();
		this._resolveBin();
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

		console.log('%s# exec: "%s"', this.pluginName, command);

		exec(command, {
			env: process.env
		},function (error/*, stdout, stderr*/) {
			if (error !== null) {
				console.error('%s# success (%s>)', this.pluginName, config.file, outFile);
				try{
					fs.unlinkSync(outFile);
				} catch(e){
					console.log('%s# deleting %s failed', this.pluginName, outFile);
					this._eexception(e);
				}
				/*console.log('stdout: %s', stdout);
				console.error('stderr: %s', stderr);
				console.error('exec error: ' + error);*/
			} else {
				console.log('%s# %s success(%s)', this.pluginName, config.file, outFile);
				if (this._deleteInFileOnSuccess) {
					try{
						fs.unlinkSync(config.file);
						console.log('%s# %s deleted', this.pluginName, config.file);
					} catch(e){
						console.log('%s# deleting %s failed', this.pluginName, config.file);
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
		var file = this._files.shift();
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

	return IPlugin;
}());
