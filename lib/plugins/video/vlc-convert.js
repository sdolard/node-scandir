/*jslint node: true, unparam: false*/
var
path = require('path'),
util = require('util'),
fs = require('fs'),
IExecPlugin = require('../../iplugin').IExecPlugin,
libutil = require('../../libutil'),

Plugin = (function (){

	function Plugin (config) {
		this.pluginName = path.basename(__filename, '.js');
		this.pluginVersion = '0.1'; // TODO
		IExecPlugin.call(this, config);
	}
	util.inherits(Plugin, IExecPlugin);

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
		basename = path.basename(file, path.extname(file)) + '.' + this.getMuxer();
		return path.resolve(dirname, basename);
	};

	Plugin.prototype.getCommand = function(file) {
		// webm
		// transcode{vcodec=VP80,vb=2000,scale=0,acodec=vorb,ab=128,channels=2,samplerate=44100}:std{access=file,mux=webm,dst='$OUTFILE'}" $INFILE vlc://quit

		// mp4
		// transcode{vcodec=h264,vb=0,scale=0,acodec=mp4a,ab=128,channels=2,samplerate=44100}:std{access=file,mux=mp4,dst=''}
		return [
			this._filepath,
			' -I rc ',
			'--sout-ffmpeg-strict=-2 ', // this line is required on mac cf: http://vlcdirect.blogspot.fr/2012/08/when-streaming-from-pcmac-to-android.html
			'--sout ',
			'"#transcode{vcodec=', this.getVideoCodec() , ',',
			'vb=', this.getVideoBitRate(), ',',
			'scale=0,',
			'acodec=', this.getAudioCodec() , ',',
			'ab=', this.getAudioBitRate(), ',',
			'channels=2,',
			'samplerate=44100',
			'}:std{',
			'access=file,',
			'mux=', this.getMuxer(), ',',
			'dst=\'' + this.getOutFile(file) + '\''+
			'}" ',
			'"' + file + '" ',
			'vlc://quit;'
		].join('');
	};

	Plugin.prototype.getVideoCodec = function() {
		var vc = ['h264', 'VP80'];
		if(this.options.vc === undefined) {
			return 'h264';
		}
		if (vc.indexOf(this.options.vc) === -1) {
			this._eexception({
				message: 'Unsupported video codec',
				code : 'EUNSUPPORTEDOPTION'
			});
		}
		return this.options.vc;
	};

	Plugin.prototype.getVideoBitRate= function() {
		if (this.options.vb !== undefined) {
			return this.options.vb;
		}
		if (this.getVideoCodec() === 'h264') {
			return 0;
		}
		if (this.getVideoCodec() === 'VP80') {
			return  2000;
		}
		this._eexception({
			message: 'Unsupported video codec',
			code : 'EUNSUPPORTEDOPTION'
		});
	};

	Plugin.prototype.getAudioCodec = function() {
		var ac  = ['vorb', 'mp4a'];
		if(this.options.ac === undefined) {
			if (this.getVideoCodec() === 'h264') {
				return 'mp4a';
			}
			if (this.getVideoCodec() === 'VP80') {
				return  'vorb';
			}
			this._eexception({
				message: 'Unsupported video codec',
				code : 'EUNSUPPORTEDOPTION'
			});
		}
		if (ac.indexOf(this.options.vc) === -1) {
			this._eexception({
				message: 'Unsupported audio codec',
				code : 'EUNSUPPORTEDOPTION'
			});
		}
		return this.options.ac;
	};

	Plugin.prototype.getAudioBitRate= function() {
		if (this.options.ab !== undefined) {
			return this.options.ab;
		}
		return 128;
	};

	Plugin.prototype.getMuxer= function() {
		if (this.getVideoCodec() === 'h264') {
			return 'mp4';
		}
		if (this.getVideoCodec() === 'VP80') {
			return  'webm';
		}
		this._eexception({
			message: 'Unsupported video codec',
			code : 'EUNSUPPORTEDOPTION'
		});
	};

	Plugin.prototype.getSupportedOptions = function() {
		return {
			// video codec
			vc: [
				'{string} video codec:',
				'      - VP80',
				'      - h264 (default)'
			].join('\n'),
			// video bitrate
			vb: [
				'{number} video bitrate:',
				'      - webm (VP80 codec): default to 2000',
				'      - mp4 (h264 codec): default to 0 (auto)'
			].join('\n'),
			// audio codec
			ac: [
				'{string} audio codec:',
				'      - vorb (default for VP80 codec)',
				'      - mp4a (default for h264 codec)'
			].join('\n'),
			// audio bitrate
			ab: '{number} audio bitrate (default 128)',
			// delete original (file)
			'do': '{boolean} delete original file on success (default false)'
		};
	};


	Plugin.prototype.onDone = function(success, infile, infileStats, outfile, duration, next) {
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
			this.log("infile: %s > outfile: %s. (%s)",
				libutil.bytesToHuman(infileStats.size, true),
				libutil.bytesToHuman(stats.size, true),
				libutil.msToHuman(duration));

			this.deleteOriginal(infile, next);
		}.bind(this));
	};

	Plugin.prototype.deleteOriginal = function (file, cb) {
		/*jslint stupid: true*/
		if (this.options['do'] === true) {
			try{
				fs.unlinkSync(file);
				this.log('deleted ("%s")', file);
				cb();
			} catch(e){
				this.debug('failed deleting "%s"', file);
				this._eexception(e);
			}
			return;
		}
		cb();
	};

	/* To check if file has the waited format
	*/
	Plugin.prototype.isFileValid = function(file) {
		return path.extname(file) !== '.' + this.getMuxer();
	};

	return Plugin;
}());


exports.create = function(config) {
	return new Plugin(config);
};
