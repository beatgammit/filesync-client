(function () {
	'use strict';

	var http = require('http'),
		fs = require('fs'),
		path = require('path'),
		EventHub = require('eventhub'),
		Untar = require('tar-async/untar'),
		updateServer = 'http://localhost:3000',
		updateSleep = 1, // seconds to sleep between update checks
		updateTimeout;

	EventHub.emit('createRoute', '/update/server', 'put', function (req, res) {
		if (req.body && req.body.server) {
			updateServer = req.body.server;
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

	EventHub.emit('createRoute', '/update/server', function (req, res) {
		res.writeHead(200, {'Content-Type': 'application/json'});
		res.end('{"server": "' + updateServer + '"}');
	});

	EventHub.emit('createRoute', '/update/sleep', function (req, res) {
		res.writeHead(200, {'Content-Type': 'application/json'});
		res.end('{"seconds": ' + updateSleep + '}');
	});

	EventHub.emit('createRoute', '/update/sleep', 'put', function (req, res) {
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

	EventHub.on('server', 'close', function () {
		console.log('Updater notified');
		if (updateTimeout) {
			clearTimeout(updateTimeout);
			updateTimeout = null;
		}
	});

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

				wStream = fs.createWriteStream(path.join(process.cwd(), header.filename));
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

	module.exports.start = update;
}());
