var scandir = require('../lib/scandir').create();

scandir.on('file', function(file, stats) {
	console.log(file + ' ' +  stats.size);
});

scandir.on('error', function(err){
	console.error(err);
});

scandir.on('end', function(){
	console.log('Done');
});

scandir.scan({
	dir: '.',
	recursive: true,
	filter: /.*/
});