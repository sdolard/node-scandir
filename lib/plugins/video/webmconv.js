var
  path = require('path'),
  util = require('util'),
  fs = require('fs'),
  os = require('os'),
  IExecPlugin = require('../../iplugin').IExecPlugin,
  libutil = require('../../libutil'),

  Plugin = (function() {

    function Plugin(config) {
      this.pluginName = path.basename(__filename, '.js');
      this.pluginVersion = '0.1'; // TODO
      IExecPlugin.call(this, config);
    }
    util.inherits(Plugin, IExecPlugin);

    Plugin.prototype.getPlatformRequirement = function() {
      return {
        'linux': {
          bin: 'avconv',
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
        '-i', file,
        '-threads', os.cpus().length,
        '-qmin 1',
        '-qmax 31',
        '-minrate 0',
        '-maxrate 9000000',
        '-f webm',
        this.getOutFile(file)
      ].join(' ');
    };

    Plugin.prototype.getSupportedOptions = function() {
      return {
        // delete original (file)
        'do': '{boolean} delete original file on success (default false)'
      };
    };


    Plugin.prototype.onDone = function(success, infile, infileStats, outfile, duration, next) {
      if (!success) {
        next();
        return;
      }

      fs.stat(outfile, function onStat(err, stats) {
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

    Plugin.prototype.deleteOriginal = function(file, cb) {
      if (this.options['do'] === true) {
        try {
          fs.unlinkSync(file);
          this.log('deleted ("%s")', file);
          cb();
        } catch (e) {
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
      return path.extname(file) !== '.webm';
    };

    return Plugin;
  }());


exports.create = function(config) {
  return new Plugin(config);
};
