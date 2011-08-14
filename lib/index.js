(function () {
	'use strict';

	var serverMod = require('./server'),
		updater = require('./updater');

	module.exports.startServer = serverMod.start;
	module.exports.stopServer = serverMod.stop;
	module.exports.server = serverMod.server;

	module.exports.startUpdater = updater.start;
}());
