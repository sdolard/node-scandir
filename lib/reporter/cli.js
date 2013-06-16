var
util = require('util'),
libutil = require('../libutil'),
ansi = require('ansi'),
path = require('path'),
stderrCursor = ansi(process.stderr),
cursor = ansi(process.stdout);

exports.onFile = function(file, stats, match){
	var filepath, basename, begin, mid, end;
	if (util.isArray(match)) {

		filepath = path.dirname(file);
		basename = path.basename(file);
		begin = basename.slice(0, match.index);
		mid = match[0];
		end = basename.slice(match.index + mid.length);

		cursor.
			write(filepath).
			write('/').
			write(begin).
			red().
			write(mid).
			reset().
			write(end).
			write(', ').
			write(libutil.bytesToHuman(stats.size, true)).
			write('\n').
			reset();
		return;
	}
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
	stderrCursor.red();
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
	stderrCursor.reset();
};
