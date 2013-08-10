/*jslint node: true*/
var
util = require('util'),
libutil = require('../libutil'),
ansi = require('ansi'),
path = require('path'),
stderrCursor = ansi(process.stderr),
cursor = ansi(process.stdout),
SIZE_PAD = 7,
DATE_PAD = 2,
MONTH_PAD = 3,
HOUR_OR_YEAR_PAD = 5;

exports.onFile = function(file, stats, match){
	var filepath, basename, begin, mid, end,
	size = libutil.stringPad(libutil.bytesToHuman(stats.size, true), SIZE_PAD, true),
	date = libutil.stringPad(stats.mtime.getDate(), DATE_PAD, true),
	month = libutil.stringPad(libutil.MONTH_NAMES[stats.mtime.getMonth()], MONTH_PAD, true),
	hourOrYear = stats.mtime.getFullYear();

	// Year or date
	if ((new Date()).getFullYear() === hourOrYear) {
		hourOrYear = util.format('%s:%s',
			libutil.numPad(stats.mtime.getHours(), 2),
			libutil.numPad(stats.mtime.getMinutes(), 2));
	}
	hourOrYear = libutil.stringPad(hourOrYear, HOUR_OR_YEAR_PAD, true);


	// Search match ?
	if (util.isArray(match)) {
		filepath = path.dirname(file);
		basename = path.basename(file);
		begin = basename.slice(0, match.index);
		mid = match[0];
		end = basename.slice(match.index + mid.length);

		cursor.
			write(size).
			write(' ').
			write(date).
			write(' ').
			write(month).
			write(' ').
			write(hourOrYear).
			write(' ').
			write(filepath).
			write('/').
			write(begin).
			red().
			write(mid).
			reset().
			write(end).
			write('\n').
			reset();
		return;
	}
	console.log(util.format('%s %s %s %s %s',
		size,
		date,
		month,
		hourOrYear,
		file));
};

exports.onEnd = function(totalCount, totalSize) {
	if(totalCount === 0) {
		console.log('No match');
		return;
	}
	console.log(util.format('%s %s file%s',
		libutil.stringPad(libutil.bytesToHuman(totalSize, true), SIZE_PAD, true),
		totalCount,
		totalCount > 1 ? 's' : ''
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


