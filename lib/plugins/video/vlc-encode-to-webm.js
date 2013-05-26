//cvlc-encdode-to-webm
//#!/bin/bash

//INFILE=$1
//OUTFILE="$INFILE".webm

//cvlc --sout "#transcode{vcodec=VP80,vb=2000,scale=0,acodec=vorb,ab=128,channels=2,samplerate=44100}:std{access=file,mux=webm,dst='$OUTFILE'}" $INFILE vlc://quit

var
path = require('path'),
util = require('util'),
fs = require('fs'),
IPlugin = require('../../iplugin').IPlugin,
libutil = require('../../libutil'),

Plugin = (function (){

	function Plugin (config) {
		IPlugin.call(this, config);
		this.pluginName = path.basename(__filename, '.js');
		this.pluginVersion = '0.1'; // TODO
	}
	util.inherits(Plugin, IPlugin);

	Plugin.prototype.getPlatformRequirement = function(){
		return {
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
	};

	// todo check if out file not already exists
	Plugin.prototype.getOutFile = function(file) {
		var
		dirname = path.dirname(file),
		basename = path.basename(file, path.extname(file)) + '.webm';
		return path.resolve(dirname, basename);
	};

	Plugin.prototype.getCommand = function(file) {
		return [
			this._filepath,
			' -I rc ',
			'--sout ',
			'"#transcode{vcodec=VP80,',
			'vb=', this.options.vb === undefined ? 2000 : this.options.vb,
			',scale=0,acodec=vorb,',
			'ab=', this.options.vb === undefined ? 128 : this.options.ab,
			',channels=2,samplerate=44100}:std{access=file,mux=webm,dst=\'' + this.getOutFile(file) + '\'}" ',
			'"' + file + '" ',
			'vlc://quit;'
		].join('');
	};

	IPlugin.prototype.getSupportedOptions = function() {
		return {
			vb: "{number} video bitrate (default 2000)",
			ab: "{number} audio bitrate (default 128)"
		};
	};


	Plugin.prototype.onDone = function(success, infile, infileStats, outfile, next) {
		/*jslint unparam: true*/
		if (!success) {
			next();
			return;
		}

		fs.stat(outfile, function onStat(err, stats){
			if (err) {
				next();
				return;
			}
			this.log("infile: %s > outfile: %s", libutil.bytesToHuman(infileStats.size, true), libutil.bytesToHuman(stats.size, true));
		}.bind(this));
	};

	/* To check if file has the waited format
	*/
	Plugin.prototype.isFileValid = function(file) {
		return path.extname(file) !== '.webm';
	};

	return Plugin;
}());


exports.create = function(config) {
	return new Plugin(config);
};
