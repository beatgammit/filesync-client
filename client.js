(function () {
	'use strict';

	var connect = require('connect'),
		path = require('path'),
		http = require('http'),
		fs = require('fs'),
		Untar = require('tar-async/untar'),
		port = 2500,
		updateServer = 'http://localhost:3000',
		updateSleep = 1; // seconds to sleep between update checks

	function update() {
		var req = http.request({
			method: 'GET',
			host: updateServer,
			path: '/update',
			'headers': {
				'Accept': 'application/tar'
			}
		}, function (res) {
			var untar = new Untar(function (err, header, fileStream) {
				var wStream;

				if (err) {
					console.error(err);
					return;
				}

				wStream = fs.createWriteStream(path.join(proccess.cwd(), header.filename));
				fileStream.pipe(wStream);
			});
			untar.once('end', function () {
				setTimeout(update, updateSleep * 1000);
			});

			res.pipe(untar);
		});

		req.on('error', function (err) {
			console.error('Error getting update:', err);
			setTimeout(update, updateSleep * 1000);
		});
	}
	
	function route(app) {
		app.put('/update/server', function (req, res, next) {
			if (req.body && req.body['server']) {
				updateServer = req.body['server'];
				res.writeHead(204, {
					'Access-Control-Allow-Origin': 'http://localhost'
				});
				res.end();
				return;
			}

			res.writeHead(400, {
				'Access-Control-Allow-Origin': 'http://localhost'
			});
			res.end();
		});

		app.get('/update/server', function (req, res) {
			res.writeHead(200, {'Content-Type': 'application/json'});
			res.end('{"server": "' + updateServer + '"}');
		});

		app.get('/update/sleep', function (req, res) {
			res.writeHead(200, {'Content-Type': 'application/json'});
			res.end('{"seconds": ' + updateSleep + '}');
		});

		app.put('/update/sleep', function (req, res) {
			if (req.body && req.body.seconds) {
				if (typeof req.body.seconds === 'number') {
					this.updateSleep = req.body.seconds;
					res.writeHead(204);
					res.end();
					return;
				}
				console.log('Possibly malformed seconds:', req.body.seconds);
			}

			res.writeHead(400);
			res.end();
		});

		app.get('/cwd', function (req, res) {
			res.writeHead(200);
			res.end(process.cwd());
		});

		app.get('/dir', function (req, res) {
			res.end(__dirname);
		});
	}

	connect(
		connect.bodyParser({keepExtensions: true}),
		connect.router(route),
		connect.static(__dirname)
	).listen(port, function () {
		console.log('Server listening on port ' + port);
		update();
	});
}());
