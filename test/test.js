var
path = require('path'),
assert = require('assert'),
util = require('util'),
exec = require('child_process').exec,
scandir = require('../lib/scandir');

describe('scandir lib', function(){
	describe('When scanning a file', function(){
		it('should find this files', function(done){
			var
			scan = scandir.create(),
			foundFile = 0,
			files = {
				'foo.txt': true
			};
			scan.on('file' , function(file, stats){
				assert(files[path.basename(file)]);
				foundFile++;
			});
			scan.on('end' , function(){
				assert.deepEqual(foundFile, 1);
				done();
			});
			scan.scan({
				dir: __dirname + '/foo.txt',
				recursive: false
			});
		});
	});

	describe('When scanning test dir not recursive', function(){
		it('should find 3 files', function(done){
			var
			scan = scandir.create(),
			foundFile = 0,
			files = {
				'bar.txt': true,
				'foo.txt': true,
				'test.js': true
			};
			scan.on('file' , function(file, stats){
				assert(files[path.basename(file)]);
				foundFile++;
			});
			scan.on('end' , function(){
				assert.deepEqual(foundFile, 3);
				done();
			});
			scan.scan({
				dir: __dirname,
				recursive: false
			});
		});
	});

	describe('When scanning test dir recursive', function(){
		it('should find 5 files', function(done){
			var
			scan = scandir.create(),
			foundFile = 0,
			files = {
				'bar.txt': true,
				'foo.txt': true,
				'test.js': true,
				'foobar.txt': true,
				'qux': true
			};
			scan.on('file' , function(file, stats){
				assert(files[path.basename(file)]);
				foundFile++;
			});
			scan.on('end' , function(){
				assert.deepEqual(foundFile, 5);
				done();
			});
			scan.scan({
				dir: __dirname,
				recursive: true
			});
		});
	});

	describe('When scanning test dir recursive with lowerthan set to 1', function(){
		it('should find 1 files', function(done){
			var
			scan = scandir.create(),
			foundFile = 0,
			files = {
				'foo.txt': true
			};
			scan.on('file' , function(file, stats){
				assert(files[path.basename(file)]);
				foundFile++;
			});
			scan.on('end' , function(){
				assert.deepEqual(foundFile, 1);
				done();
			});
			scan.scan({
				dir: __dirname,
				recursive: true,
				lowerthan: 1
			});
		});
	});

	describe('When scanning test dir recursive with greaterthan set to 9', function(){
		it('should find 2 files', function(done){
			var
			scan = scandir.create(),
			foundFile = 0,
			files = {
				'test.js': true,
				'bar.txt': true
			};
			scan.on('file' , function(file, stats){
				assert(files[path.basename(file)]);
				foundFile++;
			});
			scan.on('end' , function(){
				assert.deepEqual(foundFile, 2);
				done();
			});
			scan.scan({
				dir: __dirname,
				recursive: true,
				greaterthan: 9
			});
		});
	});

	describe('When scanning test dir recursive with greaterthan set to 4, lowerthan set to 10', function(){
		it('should find 1 files', function(done){
			var
			scan = scandir.create(),
			foundFile = 0,
			files = {
				'qux': true
			};
			scan.on('file' , function(file, stats){
				assert(files[path.basename(file)]);
				foundFile++;
			});
			scan.on('end' , function(){
				assert.deepEqual(foundFile, 1);
				done();
			});
			scan.scan({
				dir: __dirname,
				recursive: true,
				greaterthan: 4,
				lowerthan: 10
			});
		});
	});


	describe('When scanning test dir invalid lowerthan greaterthan range', function(){
		it('should throw an error', function(done){
			var scan = scandir.create();
			scan.on('error' , function(err){
				assert(err.code === 'ESIZERANGE');
				done();
			});
			scan.scan({
				dir: __dirname,
				greaterthan: 5,
				lowerthan: 4
			});
		});
	});


	describe('When scanning test dir recursive with string filter', function(){
		it('should find 1 files', function(done){
			var
			scan = scandir.create(),
			foundFile = 0;
			scan.on('file' , function(file, stats){
				foundFile++;
			});
			scan.on('end' , function(){
				assert.deepEqual(foundFile, 1);
				done();
			});
			scan.scan({
				dir: __dirname,
				recursive: true,
				filter: 'qux'
			});
		});
	});

	describe('When scanning an invalid dir', function(){
		it('should throw an exception', function(done){
			var
			scan = scandir.create();
			scan.on('error' , function(error){
				assert.strictEqual(error.code, 'EINVALIDDIR');
				done();
			});

			scan.scan();
		});
	});

	describe('When scanning a non exists dir', function(){
		it('should throw an exception', function(done){
			var
			scan = scandir.create();
			scan.on('error' , function(error){
				assert.strictEqual(error.code, 'ENOENT');
				done();
			});

			scan.scan( {
				dir: 'noexists'
			});
		});
	});
});





describe('scandir app', function(){
	describe('When scanning a file', function(){
		it('should find this files', function(done){
			var child = exec(util.format('%s/../bin/scandir %s/foo.txt', __dirname, path.basename(__dirname)),
				function (error, stdout, stderr) {
				assert.equal(stdout, [
					'test/foo.txt, 0 B',
					'1 file, 0 B',
					''].join('\n'));
				done();
			});
		});
	});

	describe('When scanning test/baz dir not recursive', function(){
		it('should find 1 files', function(done){
			var child = exec(util.format('%s/../bin/scandir %s/baz', __dirname, path.basename(__dirname)),
				function (error, stdout, stderr) {
				assert.equal(stdout, 'test/baz/qux, 5 B\n1 file, 5 B\n');
				done();
			});

		});
	});

	describe('When scanning test/baz dir recursive', function(){
		it('should find 2 files', function(done){
			var child = exec(util.format('%s/../bin/scandir -r %s/baz', __dirname, path.basename(__dirname)),
				function (error, stdout, stderr) {
				assert.equal(stdout, [
					'test/baz/quux/foobar.txt, 1 B',
					'test/baz/qux, 5 B',
					'2 files, 6 B',
					''
				].join('\n'));
				done();
			});
		});
	});


	describe('When scanning test dir recursive with string filter', function(){
		it('should find 1 files', function(done){

			var child = exec(util.format('%s/../bin/scandir -e qux -r %s/baz', __dirname, path.basename(__dirname)),
				function (error, stdout, stderr) {
				assert.equal(stdout, 'test/baz/qux, 5 B\n1 file, 5 B\n');
				done();
			});
		});
	});

	describe('When scanning test dir recursive with string insensitive filter', function(){
		it('should find 1 files', function(done){

			var child = exec(util.format('%s/../bin/scandir -i -e QUX -r %s/baz', __dirname, path.basename(__dirname)),
				function (error, stdout, stderr) {
				assert.equal(stdout, 'test/baz/qux, 5 B\n1 file, 5 B\n');
				done();
			});
		});
	});

	describe('When scanning test dir recursive with regexp filter', function(){
		it('should find 2 files', function(done){

			var child = exec(util.format('%s/../bin/scandir -e "^\\w{3}\\.txt$" -r %s', __dirname, path.basename(__dirname)),
				function (error, stdout, stderr) {
				assert.equal(stdout, [
					'test/bar.txt, 10 B',
					'test/foo.txt, 0 B',
					'2 files, 10 B',
					''
				].join('\n'));
				done();
			});
		});
	});

	describe('When scanning test dir recursive with wildcard filter', function(){
		it('should find 3 files', function(done){

			var child = exec(util.format('%s/../bin/scandir -w "*.txt" -r %s', __dirname, path.basename(__dirname)),
				function (error, stdout, stderr) {
				assert.equal(stdout, [
					'test/bar.txt, 10 B',
					'test/baz/quux/foobar.txt, 1 B',
					'test/foo.txt, 0 B',
					'3 files, 11 B',
					''
				].join('\n'));
				done();
			});
		});
	});

	describe('When scanning an invalid dir', function(){
		it('should warn', function(done){
			var child = exec(util.format('%s/../bin/scandir noneexistsdir', __dirname),
				function (error, stdout, stderr) {
				assert.equal(stderr, '!!! Path not found: \"noneexistsdir\"\n');
				done();
			});
		});
	});

	describe('When scanning test dir recursive with lowerthan set to 1', function(){
		it('should find 1 files', function(done){
			var child = exec(util.format('%s/../bin/scandir -r -l 1 %s', __dirname, path.basename(__dirname)),
				function (error, stdout, stderr) {
				assert.equal(stdout, 'test/foo.txt, 0 B\n1 file, 0 B\n');
				done();
			});
		});
	});

	describe('When scanning test dir recursive with greaterthan set to 4', function(){
		it('should find 1 files', function(done){
			var child = exec(util.format('%s/../bin/scandir -r -g 4 %s/baz', __dirname, path.basename(__dirname)),
				function (error, stdout, stderr) {
				assert.equal(stdout, 'test/baz/qux, 5 B\n1 file, 5 B\n');
				done();
			});
		});
	});

	describe('When scanning test dir recursive with greaterthan set to 4, lowerthan set to 10', function(){
		it('should find 1 files', function(done){
			var child = exec(util.format('%s/../bin/scandir -r -g 4 -l 10 %s', __dirname, path.basename(__dirname)),
				function (error, stdout, stderr) {
				assert.equal(stdout, 'test/baz/qux, 5 B\n1 file, 5 B\n');
				done();
			});
		});
	});


	describe('When scanning test dir invalid lowerthan greaterthan range', function(){
		it('should throw an error', function(done){
			var child = exec(util.format('%s/../bin/scandir -r -g 5 -l 4 %s', __dirname, path.basename(__dirname)),
				function (error, stdout, stderr) {
				assert.equal(stderr, 'Invalid range size (greaterthan and lowerthan value)\n');
				done();
			});

		});
	});

});
