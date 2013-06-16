var
path = require('path'),
util = require('util'),
fs = require('fs'),
IPlugin = require('../iplugin').IPlugin,

Plugin = (function (){

	function Plugin (config) {
		this.pluginName = path.basename(__filename, '.js');
		this.pluginVersion = '0.1'; // TODO
		IPlugin.call(this, config);
	}
	util.inherits(Plugin, IPlugin);

	/*
	* Check if "file" has the required format
	* @params {string} filepath
	* @returns {boolean} return true if filepath is valid
	*/
	IPlugin.prototype.isFileValid = function() {
		return true;
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
		fs.unlink(config.file, function(err){
			if (err) {
				console.error("deleting \"%s\" failed", config.file);
				config.done(false);
				return;
			}
			config.done(true);
		});
	};

	return Plugin;
}());


exports.create = function(config) {
	return new Plugin(config);
};
