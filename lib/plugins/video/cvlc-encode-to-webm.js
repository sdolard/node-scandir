//cvlc-encdode-to-webm
//#!/bin/bash

//INFILE=$1
//OUTFILE="$INFILE".webm

//cvlc --sout "#transcode{vcodec=VP80,vb=2000,scale=0,acodec=vorb,ab=128,channels=2,samplerate=44100}:std{access=file,mux=webm,dst='$OUTFILE'}" $INFILE vlc://quit

var
path = require('path'),
fs = require('fs');

exports.singleton = (function (){

	function Plugin () {
		this.files = [];
		this.deleteInFileOnSuccess = false;
		this.filepath = '';
		this.defaultBin = 'VLC';
		this.platform = {
			'darwin': {
				pathList: ['/Applications/VLC.app/Contents/MacOS'],
				install: 'http://www.videolan.org/vlc/download-macosx.html'
				// TODO: > '/Users/<username>/Applications/VLC.app/Contents/MacOS'
			},
			'linux':{
				pathList: process.env.PATH.split(path.delimiter),
				install: 'Check your distro'
			}
		};
		this.resolveBin();
	}

	Plugin.prototype.run = function(file/*, stats*/) {
		var
		inFile = file,
		outFile = this.toOutFile(inFile);
		this.command = [
			this.filepath,
			'-I rc',
			'--sout',
			'"#transcode{vcodec=VP80,vb=2000,scale=0,acodec=vorb,ab=128,channels=2,samplerate=44100}:std{access=file,mux=webm,dst=\'' + outFile + '\'}"',
			inFile,
			'vlc://quit;'
		].join(' ');
		console.log(this.command);
	};

	// todo check if out file not already exists
	Plugin.prototype.toOutFile = function(file) {
		var
		dirname = path.dirname(file),
		basename = path.basename(file, path.extname(file)) + '.webm';
		return path.resolve(dirname, basename);
	};

	/* To check if file has the waited format
	*/
	Plugin.prototype.isFileValid = function() {
		return true;
	};

	Plugin.prototype.areDependenciesFound = function() {
		return true;
	};

	Plugin.prototype.onScanFile = function(file, stats){
		if (!this.isFileValid(file)){
			return;
		}
		this.files.push({
			file: file,
			stats: stats
		});
	};

	Plugin.prototype.onScanEnd = function(/*totalCount, totalSize*/){
		this.files.forEach(function(item){
			this.run(item.file, item.stats);
		}.bind(this));
	};

	Plugin.prototype.resolveBin = function(){
		var filepath, platform, i;
		if (!this.platform.hasOwnProperty(process.platform)) {
			this._eexception({
				message: 'Platform is not supported',
				code: 'EPLATFORM'
			});
		}
		platform = this.platform[process.platform];
		for (i = 0; i < platform.pathList.length; i++){
			filepath = path.resolve(platform.pathList[i], this.defaultBin);
			//console.log('filepath: %s', filepath);
			if (fs.existsSync(filepath)) {
				this.filepath = filepath;
				break;
			}
		}
		if (this.filepath === '') { // not found
			this._eexception({
				message: this.defaultBin + ' is required.\nInstall it: ' + platform.install,
				code: 'EREQUIREMENT'
			});
		}
	};

	/**
	* @private
	*/
	Plugin.prototype._eexception = function(exception) {
		var error;
		if (exception instanceof Error) {
			error = exception;
		} else {
			error = new Error(exception.message);
			Error.captureStackTrace(error, Plugin.prototype._eexception); // we do not trace this function
			error.code = exception.code;
		}
		throw error;
	};

	return new Plugin();
}());