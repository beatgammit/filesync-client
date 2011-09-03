(function () {
	'use strict';

	var http = require('http'),
		fs = require('fs'),
		path = require('path'),
		npm = require('npm'),
		eventHub = require('eventhub'),
		Untar = require('tar-async/untar'),
		updateSleep = 10, // seconds to sleep between update checks
		updateTimeout,
		server;

	function update() {
		updateTimeout = null;

		console.log('Checking for updates');
		npm.commands.outdated(['filesync-client'], function (err, data) {
			if (data.length) {
				console.log('Update available');
				npm.commands.update(['filesync-client'], function (err) {
					if (err) {
						console.error(err);
					} else {
						console.log('Update installed, emitting notification');
						eventHub.emit('updateready');
					}

					updateTimeout = setTimeout(update, updateSleep * 1000);
				});
			} else {
				console.log('No update available. Retrying again in ' + updateSleep + ' seconds.');
				updateTimeout = setTimeout(update, updateSleep * 1000);
			}
		});
	}

	server = eventHub.get('server');

	// if there's a server, add some routes
	if (server) {
		server.emit('createRoute', '/update/sleep', function (req, res) {
			res.writeHead(200, {'Content-Type': 'application/json'});
			res.end('{"seconds": ' + updateSleep + '}');
		});

		server.emit('createRoute', '/update/sleep', 'put', function (req, res) {
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
	}

	eventHub.on('server', 'close', function () {
		console.log('Updater notified');
		if (updateTimeout) {
			clearTimeout(updateTimeout);
			updateTimeout = null;
		}
	});

	module.exports.start = function () {
		npm.load({'global': true}, update);
	};
}());
