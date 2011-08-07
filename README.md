Intro
=====

This is the client for filesync. Nothing here really works, except the install system is kinda working.  Eventually this will be a full-featured client for filesync that has these features:

* Automatic updates
* Native init scripts for all systems
  * Systemd if supported
  * Upstart if supported
  * "Regular" init script as fallback
* Browser-based configuration
* Nearly instantaneous updates of remotely changed files
* HTTP auth system for http-based pam module (included)
* Cross-platform install scripts based on npm

Installing
----------

    git clone git://github.com/beatgammit/filesync-client.git
    cd filesync-client
	npm install

The installer can take some command-line parameters. Currently supported parameters are:

* `--pam-module`- if present, compiles and "installs" the http pam module
* `--pam-module-name name`- the name for the http pam module. Defaults to http-auth.so
* `--binroot path/to/dir`- where to install the server
* `--pam-path path/to/pam/dir`- where to put the pam module
* `--port 2000`- port of the server

Anything else may have undesired results. I use a couple parameters in development, and these should only be used with extreme care.

To install with parameters, do:

`npm install [parameters]`

So, to change the install port, do:

`npm install --port 4567`

Running
-------

filesync-client now supports npm start. Just do:

`npm start filesync-client` after npm installing it and the server will be run in the background on whatever port is in the package.json file. This is only really useful for testing purposes right now and there's no way to actually kill the server besides `kill PID`. It's just easier than doing `cd node_modules/filesync-client/bin/ ; ./filesync`.

This method will be obsolete when it's running as a background process, but for now, it's quite convenient. Just take out the & in the package.json if you don't want it to run in the background (even more convenience).

What works
----------

The install process for systemd-based systems seems to work. It hasn't been tested for an actual global install, but it seems to work fine with local installs.

`npm install` works except for the node-fs module, which I have patched (not included) and submitted a pull-request for.

What doesn't work
-----------------

Everything else.

Updating may work, but is untested. Upstart is not supported at all.
