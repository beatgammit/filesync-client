#!/usr/bin/env node
(function () {
	'use strict';

	var serverMod = require('./server');

	module.exports.startServer = serverMod.start;
	module.exports.stopServer = serverMod.stop;
	module.exports.server = serverMod.server;
}());
