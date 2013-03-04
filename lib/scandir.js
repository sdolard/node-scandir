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
		* @params [{object}] config
		* @params [{booleab}] config.debug. Defautl false
		* @event file({string} filePath, {Stats} stats)
		* @event end // there is no more file
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
		};

		/**
		* @method
		* @public
		* @params <{object}> config
		* @params <{string}> config.dir
		* @params [{boolean}]config.recursive. Default to true.
		* @params [{boolean}]config.insensitive. Default to false. Only available with String filter
		* @params [{RegExp|String|undefined}] config.filter. String === exact match
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

			if (!this._dir) {
				return this._eexception({
						code: 'EINVALIDDIR',
						message: 'dir property is empty'
				});
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
			var action = this._actionStack.pop();
			if (!action) {
				this._reset();
				return this.emit('end');
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
				this._eexception({
					code: 'EBROKENLINK',
					message: util.format('Symbolic link broken: "%s"', file)
				});
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
			} else {
				this._eexception({
						code: 'EINVALIDENT',
						message: util.format('"%s" is not a file neither a directory', this._dir)
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

		/**
		* @private
		*/
		ScanDir.prototype._applyFilter = function(file, basename, stats) {

			this.debug(util.format('_applyFilter ("%s"; case insensitive: %s) on %s',
				this._filter,
				this._insensitive === true, file));

			if (!this._filter) {
				this.emit('file', file, stats);
			} else if (this._filter instanceof RegExp) {
				// RegExp OR Wildcard converted to RegExp
				try {
					if (basename.match(this._filter) !== null) {
						this.emit('file', file, stats);
					}
				} catch(e) {
					return this._eexception(e);
				}
			} else {
				// String
				// TODO: do _filter.toLowerCase() before and once
				if (this._insensitive) {
					if (basename.toLowerCase() === this._filter.toLowerCase()) {
						this.emit('file', file, stats);
					}
				} else {
					if (basename === this._filter) {
						this.emit('file', file, stats);
					}
				}
			}

			this._popAction();
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