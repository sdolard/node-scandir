var
util = require('util'),
libutil = require('../libutil'),
ansi = require('ansi'),
cursor = ansi(process.stderr);

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

exports.onError = function (err) {
	cursor.red();
	switch(err.code) {
	case 'ENOENT':
		console.error(util.format('Path not found: "%s"', err.path));
		break;
	case 'EACCES':
		console.error(util.format('Acces error: "%s"', err.path));
		break;

	case 'ELOOP':
		console.error(util.format('Loop error: "%s"', err.path));
		break;

	case 'EBROKENLINK':
	case 'ENAMETOOLONG':
	case 'ENOTDIR':
	case 'EBADF':
		 console.error(err.message);
		 break;

	default: console.error(err);

	}
	cursor.reset();
};
