var 
util = require('util'),
libutil = require('../libutil');

exports.init = function(){
};

exports.onFile = function(file, stats){
	console.log(util.format('%s, %s', file, libutil.bytesToHuman(stats.size, true)));
};

exports.onEnd = function(totalCount, totalSize) {
	if(totalCount === 0) {
		console.log('No match');
		return;
	} 
	console.log(util.format('%s file%s, %s', 
		totalCount,
		totalCount > 1 ? 's' : '',
		libutil.bytesToHuman(totalSize, true)	
	));
};
