//cvlc-encdode-to-webm
//#!/bin/bash

//INFILE=$1
//OUTFILE="$INFILE".webm

//cvlc --sout "#transcode{vcodec=VP80,vb=2000,scale=0,acodec=vorb,ab=128,channels=2,samplerate=44100}:std{access=file,mux=webm,dst='$OUTFILE'}" $INFILE vlc://quit

var
path = require('path'),
fs = require('fs'),
exec = require('child_process').exec;

exports.singleton = (function (){

	function Plugin () {
		this.files = [];
		this.deleteInFileOnSuccess = true;
		this.filepath = '';
		this.platform = {
			'darwin': {
				bin: 'VLC',
				pathList: [
					'/Users/' + process.env.USER + '/Applications/VLC.app/Contents/MacOS',
					'/Applications/VLC.app/Contents/MacOS'
				],
				install: 'http://www.videolan.org/vlc/download-macosx.html'
			},
			'linux':{
				bin: 'vlc',
				pathList: process.env.PATH.split(path.delimiter),
				install: 'check your distro'
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
			'"' + inFile + '"',
			'vlc://quit;'
		].join(' ');
		console.log('Running %s ...', this.command);
		exec(this.command, {
			env: process.env
		},function (error, stdout, stderr) {
			if (error !== null) {
				console.error('%s encoding to %s failed', inFile, outFile);
				try{
					fs.unlinkSync(outFile);
				} catch(e){
					console.log('Deleting %s failed', outFile);
					this._eexception(e);
				}
				/*console.log('stdout: %s', stdout);
				console.error('stderr: %s', stderr);
				console.error('exec error: ' + error);*/
			} else {
				console.log('%s successfully encoded to %s', inFile, outFile);
				if (this.deleteInFileOnSuccess) {
					try{
						fs.unlinkSync(inFile);
						console.log('%s deleted', inFile);
					} catch(e){
						console.log('Deleting %s failed', inFile);
						this._eexception(e);
					}
				}
			}
			this.onScanEnd();
		}.bind(this));
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
	Plugin.prototype.isFileValid = function(file) {
		return path.extname(file) !== '.webm';
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
		if (this.files.length === 0) {
			return;
		}
		var file = this.files.shift();
		this.run(file.file, file.stats);
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
			filepath = path.resolve(platform.pathList[i], platform.bin);
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