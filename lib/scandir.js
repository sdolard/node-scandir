/*
Copyright © 2013 by Sebastien Dolard (sdolard@gmail.com)


Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*/

var
fs = require('fs'),
util = require('util'),
path = require('path'),
EventEmitter = require('events').EventEmitter;


exports.create = (function () {
		/**
		* @class
		* @public
		* @params [{Object}] config
		* @params [{Booleab}] config.debug. Defautl false
		* @event file({String} filePath, {Stats} stats)
		* @event end({Number} totalCount, {Number} totalSize}) > scan finished
		* @event error({Error} err)
		*/
		function ScanDir(config) {
			EventEmitter.call(this);
			config = config || {};
			this._debug = config.debug;
			this._reset();
		}
		util.inherits(ScanDir, EventEmitter);

		ScanDir.prototype._reset= function() {
			this._actionStack = [];
			this._running = false;
			this._totalCount = 0;
			this._totalSize = 0;
		};

		/**
		* @method
		* @public
		* @params <{object}> config
		* @params <{string}> config.dir
		* @params [{boolean}]config.recursive. Default to true.
		* @params [{boolean}]config.insensitive. Default to false. Only available with String filter
		* @params [{RegExp|String|undefined}] config.filter. String === exact match
		* @params [{Number}] config.greaterthan. Bytes value. Min value 0.
		* @params [{Number}] config.lowerthan. Bytes value. Min value 1.
		* @params [{boolean}]config.showbrokenlink. Default to false.
		*/
		ScanDir.prototype.scan = function(config) {
			// Running ?
			if(this._running) {
				return this._eexception({
						code: 'ESCANPENDINGDIR',
						message: 'A scan is already running.'
				});
			}
			this._running = true;

			config = config || {};

			this._dir = config.dir;
			this._recursive = config.recursive === undefined ? true : config.recursive;
			this._filter = config.filter;
			this._insensitive = config.insensitive;
			this._greaterthan = config.greaterthan !== undefined ? Math.max(parseInt(config.greaterthan, 10), 0) : undefined;
			this._lowerthan = config.lowerthan !== undefined ? Math.max(parseInt(config.lowerthan, 10), 1) : undefined;
			this._showbrokenlink = config.showbrokenlink === true;

			if (!this._dir) {
				return this._eexception({
						code: 'EINVALIDDIR',
						message: 'dir property is empty'
				});
			}

			if (this._greaterthan !== undefined &&
				this._lowerthan !== undefined) {
				if (this._lowerthan - this._greaterthan <= 1) {
					return this._eexception({
						code: 'ESIZERANGE',
						message: 'Invalid range size (greaterthan and lowerthan value)'
					});
				}

			}

			this.debug(util.format('Main dir stat: %s'), this._dir);

			// we start
			this._pushAction('stat', {
				force: true,
				file: this._dir
			});

			this._popAction();
		};

		ScanDir.prototype._pushAction = function(name, data) {
			this._actionStack.push({
				name: name,
				data: data
			});
		};

		ScanDir.prototype._popAction = function() {
			var 
			action = this._actionStack.pop(),
			totalCount, 
			totalSize;

			if (!action) {
				totalCount = this._totalCount;
				totalSize = this._totalSize;
				this._reset();
				return this.emit('end', totalCount, totalSize);
			}

			switch (action.name) {
			case 'stat':
				fs.stat(action.data.file, this._onStat.bind(this, action.data.force, action.data.file));
				break;

			case 'readdir':
				fs.readdir(action.data, this._onReadDir.bind(this, action.data));
				break;

			case 'filter':
				this._applyFilter(action.data.file, action.data.basename, action.data.stats);
				break;

			default:
				throw this._eexception({
					code: 'EINVALIDACTION',
					message: util.format('Invalid action: %s', action.name)
				});
			}
		};

		/**
		* @private
		*/
		ScanDir.prototype._onStat = function(force, file, err, stats) {
			if (err) {
				if (force) {
					this._eexception(err);
					// we abort only if it's this._dir
					return;
				}
				if (err.code !== 'ENOENT') {
					// we abort only if it's this._dir
					this._eexception(err);
					return;
				}
				if (this._showbrokenlink) {
					this._eexception({
						code: 'EBROKENLINK',
						message: util.format('Symbolic link broken: "%s"', file)
					});
				}
				this._popAction();
				return;
			}

			if (stats.isDirectory()) {
			 	if (this._recursive || force) {
					this._pushAction('readdir', file);
				}
			} else if (stats.isFile()) {
				this._pushAction("filter", {
					file: file,
					basename: path.basename(file),
					stats: stats
				});
			}
			this._popAction();
		};

		 ScanDir.prototype._onReadDir = function(dir, err, files) {
		 	var
			file = '',
			filepath = '',
			i;

			if (err) {
				return this._eexception(err);
			}

			if (files.length > 0) {
				files.sort(function(a, b) {
					return a > b ? -1 : (a < b ? 1 : 0);
				});

				files.forEach(function(file) {
					this._pushAction('stat', {
						file: path.join(dir, file),
						basename: file
					});
				}.bind(this));
			}
			this._popAction();
		};

		ScanDir.prototype._applyFilter = function(file, basename, stats) {
			if (this._matchBasenameFilter(file, basename) &&
			this._matchSizeFilter(stats)) {
				this._totalCount++;
				this._totalSize += stats.size;
				this.emit('file', file, stats);
			}

			this._popAction();
		};

		/**
		* @private
		*/
		ScanDir.prototype._matchBasenameFilter = function(file, basename, stats) {

			this.debug(util.format('_applyBasenameFilter ("%s"; case insensitive: %s) on %s',
				this._filter,
				this._insensitive === true, file));

			// No filter
			if (!this._filter) {
				return true;
			}

			// RegExp OR Wildcard converted to RegExp
			if (this._filter instanceof RegExp) {
				try {
					if (basename.match(this._filter) !== null) {
						return true;
					}
				} catch(e) {
					return this._eexception(e);
				}
			}

			// String insensitive
			// TODO: do _filter.toLowerCase() before and once
			if (this._insensitive) {
				if (basename.toLowerCase() === this._filter.toLowerCase()) {
					return true;
				}
			}

			// String sensitive
			if (basename === this._filter) {
				return true;
			}

			return false;
		};

		/**
		* @private
		*/
		ScanDir.prototype._matchSizeFilter = function(stats) {
			// no size filter
			if (this._greaterthan === undefined && this._lowerthan === undefined) {
				return true;
			}
			// only greaterthan filter
			if (this._greaterthan !== undefined && this._lowerthan === undefined) {
				return stats.size > this._greaterthan;
			}

			// only lowerthan filter
			if (this._lowerthan !== undefined && this._greaterthan === undefined) {
				return stats.size < this._lowerthan;
			}

			return stats.size > this._greaterthan && stats.size < this._lowerthan;
		};

		/**
		* Log only if debug is positive
		* @private
		*/
		ScanDir.prototype.debug = function() {
			if (!this._debug) {
				return;
			}
			var
			args = arguments,
			v = parseInt((new Date()).getTime(), 10) + ' debug ScanDir # ';
			args[0] = args[0].replace('\n', '\n' + v);
			args[0] = v.concat(args[0]);
			console.error.apply(console, args);
		};

		/**
		* @private
		*/
		ScanDir.prototype._eexception = function(exception) {
			var error;
			if (exception instanceof Error) {
				error = exception;
			} else {
				error = new Error(exception.message);
				Error.captureStackTrace(error, ScanDir.prototype._eexception); // we do not trace this function
				error.code = exception.code;
			}

			this.emit('error', error);
			this.debug(error.stack);
		};

		return function(config) {
			return new ScanDir(config);
		};
}());