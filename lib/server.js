#!/usr/bin/env node
(function () {
	'use strict';

	var connect = require('connect'),
		path = require('path'),
		http = require('http'),
		fs = require('fs'),
		Untar = require('tar-async/untar'),
		staticRoot = '../lib/public',
		updateServer = 'http://localhost:3000',
		updateSleep = 1, // seconds to sleep between update checks
		argv = require('optimist').argv,
		port = argv.port || process.env.npm_package_config_port || 3000,
		updateTimeout,
		server;

	function startServer(tPort, tAddress) {
		tPort = tPort || port;
		tAddress = tAddress || 'localhost';

		server.listen(tPort, tAddress, function () {
			console.log('Server listening on port ' + port);
		});
	}

	function stopServer() {
		if (updateTimeout) {
			clearTimeout(updateTimeout);
		}
		server.close();

		// TODO: do something more intelligent here to ensure a clean exit
		setTimeout(function () {
			process.exit();
		}, 1 * 1000);
	}
	
	function update() {
		var req;

		updateTimeout = null;

		req = http.request({
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
			updateTimeout = setTimeout(update, updateSleep * 1000);
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

		app.put('/stop', function (req, res) {
			res.end('The server is no longer accepting connections. If it needs to go down instantly, the PID is ' + process.pid);

			stopServer();
		});
	}

	server = connect(
		connect.bodyParser({keepExtensions: true}),
		connect.router(route),
		connect.static(path.join(__dirname, staticRoot))
	);

	module.exports.server = server;
	module.exports.start = startServer;
	module.exports.stop = stopServer;
}())
