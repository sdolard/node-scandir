/*jslint node: true, unparam: false*/
var
cli = require('./cli');

exports.onFile = function(file, stats, match){
	cli.onFile(file, stats, match, true);
};

exports.onEnd = function(totalCount, totalSize) {
	cli.onEnd(totalCount, totalSize);
};

exports.onError = function (err, debug) {
	cli.onError(err, debug);
};


