var
assert = require('assert'),
util = require('util'),
libutil = require('../lib/libutil');


describe('libutil', function(){
	describe('msToHuman', function(){
		it('should convert 1', function(){
			assert.equal(libutil.msToHuman(1), '0m0.001s');
		});
		it('should convert 1011', function(){
			assert.equal(libutil.msToHuman(1011), '0m1.011s');
		});
		it('should convert 1111', function(){
			assert.equal(libutil.msToHuman(1111), '0m1.111s');
		});
		it('should convert 59999', function(){
			assert.equal(libutil.msToHuman(59999), '0m59.999s');
		});
		it('should convert 60000', function(){
			assert.equal(libutil.msToHuman(60000), '1m0.000s');
		});
	});
});