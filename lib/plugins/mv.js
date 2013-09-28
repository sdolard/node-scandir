/*jslint node: true*/
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

    Plugin.prototype.getSupportedOptions = function() {
        return {
            // audio bitrate
            p: '{string} destination path (must be valid)'
        };
    };

    /*
    * Check if "file" has the required format
    * @params {string} filepath
    * @returns {boolean} return true if filepath is valid
    */
    IPlugin.prototype.isFileValid = function() {
        return true;
    };

    /*
    * Allow to convert an option value
    * @param {string} option name
    * @param {string} value option value
    */
    IPlugin.prototype.convertOption = function(option, value){
        function getUserHome() {
            return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
        }
        if (option === 'p') {
            return value.replace('~', getUserHome());
        }
        return value;
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
        var dst = path.join(this.options.p, path.basename(config.file));
        fs.rename(config.file, dst, function(err){
            if (err) {
                this.debug("mv \"%s\" failed: %s", config.file, err.message);
                config.done(false);
                return;
            }
            config.done(true);
        }.bind(this));
    };

    return Plugin;
}());


exports.create = function(config) {
    return new Plugin(config);
};
