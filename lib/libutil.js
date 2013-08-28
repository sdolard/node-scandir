
/*jslint node: true*/
var
util = require('util'),
RE_BYTES_OPTIONS = /(\d+\.?\d*)(.*)/,
CONVERT = {
	'B' :                        1,
	'kB':                     1000,
	'MB':                1000*1000,
	'GB':           1000*1000*1000,
	'TB':      1000*1000*1000*1000,
	'EB': 1000*1000*1000*1000*1000
};

/**
* @returns {number} bytes if conv is ok (-1 if error)
*/
exports.stringToBytes = function(value){
	var
	match = value.match(RE_BYTES_OPTIONS),
	unit;
	if (match === null) {
		return -1;
	}
	unit = match[2];
	if (!unit) {
		return match[1];
	}
	if (!CONVERT.hasOwnProperty(unit)) {
		return -1;
	}
	return match[1] * CONVERT[unit];
};


exports.MONTH_NAMES = [
	"jan",
	"feb",
	"mar",
	"apr",
	"may",
	"jun",
	"jul",
	"aug",
	"sep",
	"oct",
	"nov",
	"dec"
];

exports.bytesToHuman = function(bytes, si, precision){
	precision = precision === undefined ? 1 : precision;

	var
	unit = si ? 1000 : 1024,
	exp,
	pre;

	if (bytes < unit) {
		return bytes + ' B';
	}
	exp = Math.floor(Math.log(bytes) / Math.log(unit));
	pre = (si ? "kMGTPE" : "KMGTPE").charAt(exp-1) + (si ? "" : "i");
	return util.format("%s%sB", (bytes / Math.pow(unit, exp)).toFixed(precision), pre);

};

function zero(){ return '0';}
exports.numPad = function (number, padding) {
	var Tmp = Array; // jslint hack

	return (Array.apply(null, new Tmp(padding)).map(zero).join('') + number).slice(-padding);
};


exports.msToHuman = function(value){
	var
	ms = value % 1000,
	sec = Math.floor(value / 1000) % 60,
	min = Math.floor(value / (1000 * 60));
	return util.format('%dm%d.%ss', min, sec, exports.numPad(ms, 3));
};

function space(){ return ' ';}
exports.stringPad = function(message, padding, alignRight) {
	var Tmp = Array; // jslint hack
	if (alignRight){
		return (Array.apply(null, new Tmp(padding)).map(space).join('') + message).slice(-padding);
	}
	return (message + Array.apply(null, new Tmp(padding)).map(space).join('')).slice(0, padding);
};


