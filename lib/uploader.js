/*
 * Uploads files to a server.
 */
(function () {
	'use strict';

	var fs = require('fs'),
		path = require('path'),
		eventHub = require('eventhub'),
		redis = require('redis'),
		client = redis.createClient();

	// TODO: Intelligent priority queues
	// TODO: Use another database for adding stat information

	eventHub.on('fileModified', function (watchPath) {
		console.log('File modified:', watchPath);
		client.zadd('queue', 2, watchPath);
	});
	eventHub.on('newWatch', function (watchPath, stat) {
		function cb(watchPath, stat) {
			if (stat.isFile()) {
				console.log('New file:', watchPath);
				client.sadd('files', watchPath);
				client.zadd('queue', 2, watchPath);
			} else if (stat.isDirectory()) {
				console.log('New directory:', watchPath);
				client.sadd('dirs', watchPath);
				fs.readdir(watchPath, function (err, files) {
					if (err) {
						console.error('Error reading directory:', watchPath);
						return;
					}

					files.forEach(function (file) {
						var absPath = path.join(watchPath, file);
						fs.lstat(absPath, function (err, stat) {
							if (err) {
								console.error('Error stat-ing file:', absPath, err);
								return;
							}

							if (stat.isFile()) {
								client.sadd('files', path.join(watchPath, absPath));
								client.zadd('queue', 2, path.join(watchPath, absPath));
							}
						});
					});
				});
			}
		}

		if (stat) {
			return cb(watchPath, stat);
		}

		fs.lstat(watchPath, function (err, stat) {
			if (err) {
				console.error('Watch not added, stat failed');
				return;
			}

			cb(watchPath, stat);
		});
	});
	eventHub.on('fileRemoved', function (watchPath) {
		console.log('File removed:', watchPath);
		client.srem('files', watchPath);
		client.zrem('queue', watchPath);
	});
}());
