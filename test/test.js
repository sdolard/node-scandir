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
				'bar.js': true,
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
				'bar.js': true,
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
				assert.equal(stdout, 'test/foo.txt, 0 B\n');
				done();
			});
		});
	});

	describe('When scanning test/baz dir not recursive', function(){
		it('should find 1 files', function(done){
			var child = exec(util.format('%s/../bin/scandir %s/baz', __dirname, path.basename(__dirname)),
				function (error, stdout, stderr) {
				assert.equal(stdout, 'test/baz/qux, 0 B\n');
				done();
			});

		});
	});

	describe('When scanning test/baz dir recursive', function(){
		it('should find 2 files', function(done){
			var child = exec(util.format('%s/../bin/scandir -r %s/baz', __dirname, path.basename(__dirname)),
				function (error, stdout, stderr) {
				assert.equal(stdout, [
					'test/baz/quux/foobar.txt, 0 B',
					'test/baz/qux, 0 B',
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
				assert.equal(stdout, 'test/baz/qux, 0 B\n');
				done();
			});
		});
	});

	describe('When scanning test dir recursive with string insensitive filter', function(){
		it('should find 1 files', function(done){

			var child = exec(util.format('%s/../bin/scandir -i -e QUX -r %s/baz', __dirname, path.basename(__dirname)),
				function (error, stdout, stderr) {
				assert.equal(stdout, 'test/baz/qux, 0 B\n');
				done();
			});
		});
	});

	describe('When scanning test dir recursive with regexp filter', function(){
		it('should find 1 files', function(done){

			var child = exec(util.format('%s/../bin/scandir -e "^\\w{3}\\.js$" -r %s', __dirname, path.basename(__dirname)),
				function (error, stdout, stderr) {
				assert.equal(stdout, 'test/bar.js, 0 B\n');
				done();
			});
		});
	});

	describe('When scanning test dir recursive with wildcard filter', function(){
		it('should find 2 files', function(done){

			var child = exec(util.format('%s/../bin/scandir -w "*.txt" -r %s', __dirname, path.basename(__dirname)),
				function (error, stdout, stderr) {
				assert.equal(stdout, [
					'test/baz/quux/foobar.txt, 0 B',
					'test/foo.txt, 0 B',
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
});
