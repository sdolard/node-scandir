var
util = require('util'),
libutil = require('../libutil'),
files = [];

exports.init = function(){
	files = [];
};

exports.onFile = function(file, stats){
	files.push({
		file: file,
		stats: stats
	});
};

exports.onEnd = function(/*totalCount, totalSize*/) {
	console.log(util.format('%j', files));
};
