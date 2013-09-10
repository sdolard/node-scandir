var
path = require('path'),
assert = require('assert'),
util = require('util'),
exec = require('child_process').exec,
scandir = require('../lib/scandir');

/*jslint unparam: true, node: true*/

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
				dir: __dirname + '/bin/foo.txt',
				recursive: false
			});
		});
	});

	describe('When scanning test dir not recursive', function(){
		it('should find 2 files', function(done){
			var
			scan = scandir.create(),
			foundFile = 0,
			files = {
				'bar.txt': true,
				'foo.txt': true
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
				dir: __dirname + '/bin',
				recursive: false
			});
		});
	});

	describe('When scanning test dir recursive', function(){
		it('should find 4 files', function(done){
			var
			scan = scandir.create(),
			foundFile = 0,
			files = {
				'bar.txt': true,
				'foo.txt': true,
				'foobar.txt': true,
				'qux': true
			};
			scan.on('file' , function(file, stats){
				assert(files[path.basename(file)]);
				foundFile++;
			});
			scan.on('end' , function(){
				assert.deepEqual(foundFile, 4);
				done();
			});
			scan.scan({
				dir: __dirname + '/bin',
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
				dir: __dirname + '/bin',
				recursive: true,
				lowerthan: 1
			});
		});
	});

	describe('When scanning test dir recursive with greaterthan set to 9', function(){
		it('should find 1 files', function(done){
			var
			scan = scandir.create(),
			foundFile = 0,
			files = {
				'bar.txt': true
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
				dir: __dirname + '/bin',
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
				dir: __dirname + '/bin',
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
				dir: __dirname + '/bin',
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
				dir: __dirname + '/bin',
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
				assert.strictEqual(error.code, 'EFIRSTNOENT');
				done();
			});

			scan.scan( {
				dir: 'noexists'
			});
		});
	});

	describe('When scanning test dir recursive with application media filter', function(){
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
				dir: __dirname + '/bin',
				recursive: true,
				media: 'application'
			});
		});
	});

	describe('When scanning test dir recursive with an invalid media filter', function(){
		it('should throw an error', function(done){
			var scan = scandir.create();
			scan.on('error' , function(error){
				assert.strictEqual(error.code, 'EINVALIDMEDIA');
				done();
			});
			scan.scan({
				dir: __dirname + '/bin',
				recursive: true,
				media: 'foo'
			});
		});
	});
});



describe('scandir app', function(){
	describe('When scanning a file without dir', function(){
		it('should find this files in current', function(done){
			exec(util.format('%s/../bin/scandir -R unittest', __dirname),
				function (error, stdout, stderr) {
				assert.equal(stdout, [
					'   84 B .gitignore',
					'   61 B .travis.yml',
					'  3.0kB README.md',
				    '  1.0kB package.json',
				    '  4.2kB 4 files',
					''
					].join('\n'));
				done();
			});
		});
	});


	describe('When scanning a file', function(){
		it('should find this files', function(done){
			exec(util.format('%s/../bin/scandir %s/bin/foo.txt  -R unittest', __dirname, path.basename(__dirname)),
				function (error, stdout, stderr) {
				assert.equal(stdout, [
					'    0 B test/bin/foo.txt',
					'    0 B 1 file',
					''
					].join('\n'));
				done();
			});
		});
	});

	describe('When scanning test/baz dir not recursive', function(){
		it('should find 1 files', function(done){
			exec(util.format('%s/../bin/scandir %s/bin/baz  -R unittest', __dirname, path.basename(__dirname)),
				function (error, stdout, stderr) {
				assert.equal(stdout, [
					'    5 B test/bin/baz/qux',
					'    5 B 1 file',
					'',
				].join('\n'));
				done();
			});
		});
	});

	describe('When scanning test/baz dir recursive', function(){
		it('should find 2 files', function(done){
			exec(util.format('%s/../bin/scandir -r %s/bin/baz  -R unittest', __dirname, path.basename(__dirname)),
				function (error, stdout, stderr) {
				assert.equal(stdout, [
					'    1 B test/bin/baz/quux/foobar.txt',
					'    5 B test/bin/baz/qux',
					'    6 B 2 files',
					'',
				].join('\n'));
				done();
			});
		});
	});


	describe('When scanning test dir recursive with string filter', function(){
		it('should find 1 files', function(done){

			exec(util.format('%s/../bin/scandir -e qux -r %s/bin/baz  -R unittest', __dirname, path.basename(__dirname)),
				function (error, stdout, stderr) {
				assert.equal(stdout, [
					'    5 B test/bin/baz/qux',
					'    5 B 1 file',
					'',
				].join('\n'));
				done();
			});
		});
	});

	describe('When scanning test dir recursive with string insensitive filter', function(){
		it('should find 1 files', function(done){

			exec(util.format('%s/../bin/scandir -i -e QUX -r %s/bin/baz  -R unittest', __dirname, path.basename(__dirname)),
				function (error, stdout, stderr) {
				assert.equal(stdout, [
					'    5 B test/bin/baz/qux',
					'    5 B 1 file',
					'',
				].join('\n'));
				done();
			});
		});
	});

	describe('When scanning test dir recursive with regexp filter', function(){
		it('should find 2 files', function(done){

			exec(util.format('%s/../bin/scandir -e "^\\w{3}\\.txt$" -r %s/bin  -R unittest', __dirname, path.basename(__dirname)),
				function (error, stdout, stderr) {
				assert.equal(stdout, [
					'   10 B test/bin/bar.txt',
					'    0 B test/bin/foo.txt',
					'   10 B 2 files',
					''
				].join('\n'));
				done();
			});
		});
	});

	describe('When scanning test dir recursive with wildcard filter', function(){
		it('should find 3 files', function(done){

			exec(util.format('%s/../bin/scandir -w "*.txt" -r %s/bin  -R unittest', __dirname, path.basename(__dirname)),
				function (error, stdout, stderr) {
				assert.equal(stdout, [
					'   10 B test/bin/bar.txt',
					'    1 B test/bin/baz/quux/foobar.txt',
					'    0 B test/bin/foo.txt',
					'   11 B 3 files',
					''
				].join('\n'));
				done();
			});
		});
	});

	describe('When scanning an invalid dir', function(){
		it('should warn', function(done){
			exec(util.format('%s/../bin/scandir noneexistsdir', __dirname),
				function (error, stdout, stderr) {
				assert.equal(stderr, 'Path not found: \"noneexistsdir\"\n');
				done();
			});
		});
	});

	describe('When scanning test dir recursive with lowerthan set to 1', function(){
		it('should find 1 files', function(done){
			exec(util.format('%s/../bin/scandir -r -l 1 %s/bin  -R unittest', __dirname, path.basename(__dirname)),
				function (error, stdout, stderr)  {
				assert.equal(stdout, [
					'    0 B test/bin/foo.txt',
					'    0 B 1 file',
					''
				].join('\n'));
				done();
			});
		});
	});

	describe('When scanning test dir recursive with greaterthan set to 4', function(){
		it('should find 1 files', function(done){
			exec(util.format('%s/../bin/scandir -r -g 4 %s/bin/baz  -R unittest', __dirname, path.basename(__dirname)),
				function (error, stdout, stderr) {
				assert.equal(stdout, [
					'    5 B test/bin/baz/qux',
					'    5 B 1 file',
					''
				].join('\n'));
				done();
			});
		});
	});

	describe('When scanning test dir recursive with greaterthan set to 4, lowerthan set to 10', function(){
		it('should find 1 files', function(done){
			exec(util.format('%s/../bin/scandir -r -g 4 -l 10 %s/bin  -R unittest', __dirname, path.basename(__dirname)),
				function (error, stdout, stderr) {
				assert.equal(stdout, [
					'    5 B test/bin/baz/qux',
					'    5 B 1 file',
					''
				].join('\n'));
				done();
			});
		});
	});


	describe('When scanning test dir invalid lowerthan greaterthan range', function(){
		it('should throw an error', function(done){
			exec(util.format('%s/../bin/scandir -r -g 5 -l 4 %s/bin', __dirname, path.basename(__dirname)),
				function (error, stdout, stderr) {
				assert.equal(stderr, 'Invalid range size (greaterthan and lowerthan value)\n');
				done();
			});
		});
	});

	describe('When scanning test dir an invalid media type', function(){
		it('should throw an error', function(done){
			exec(util.format('%s/../bin/scandir -m foo %s/bin', __dirname, path.basename(__dirname)),
				function (error, stdout, stderr) {
				assert.equal(stderr, 'Invalid media\n');
				done();
			});
		});
	});

	describe('When scanning test dir recursive with text media filter', function(){
		it('should find 3 files', function(done){
			exec(util.format('%s/../bin/scandir -m text -r %s/bin -R unittest', __dirname, path.basename(__dirname)),
				function (error, stdout, stderr) {
				assert.equal(stdout, [
					'   10 B test/bin/bar.txt',
					'    1 B test/bin/baz/quux/foobar.txt',
					'    0 B test/bin/foo.txt',
					'   11 B 3 files',
					''
				].join('\n'));
				done();
			});
		});
	});
});
