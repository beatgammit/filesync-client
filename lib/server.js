(function () {
	'use strict';

	var connect = require('connect'),
		path = require('path'),
		eventHub = require('eventhub'),
		staticRoot = '../lib/public',
		argv = require('optimist').argv,
		port = argv.port || process.env.npm_package_config_port || 3000,
		server;

	function startServer(tPort, tAddress) {
		tPort = tPort || port;
		tAddress = tAddress || 'localhost';

		server.listen(tPort, tAddress, function () {
			console.log('Server listening on port ' + port);
		});
	}

	function stopServer() {
		server.close();

		// TODO: do something more intelligent here to ensure a clean exit
		setTimeout(function () {
			process.exit();
		}, 1000);
	}
	
	function route(app) {
		server.on('createRoute', function (route, method, handler) {
			if (typeof method === 'function') {
				handler = method;
				method = 'get';
			}
			app[method.toLowerCase()](route, handler);
		});
		app.get('/cwd', function (req, res) {
			res.writeHead(200);
			res.end(process.cwd());
		});

		app.get('/dir', function (req, res) {
			res.end(__dirname);
		});

		app.put('/stop', function (req, res) {
			stopServer();

			res.end('The server is no longer accepting connections. If it needs to go down instantly, the PID is ' + process.pid);
		});
	}

	server = connect();
	eventHub.register('server', server);

	// can't use traditional connect style because router uses server
	server.use(connect.bodyParser({keepExtensions: true}));
	server.use(connect.router(route));
	server.use(connect.static(path.join(__dirname, staticRoot)));

	eventHub.on('updateready', stopServer);

	module.exports.server = server;
	module.exports.start = startServer;
	module.exports.stop = stopServer;
}());
