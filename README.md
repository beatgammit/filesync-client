Intro
=====

This is the client for filesync. Nothing is complete, except the install system is kinda working and watching files seems to work.  Eventually this will be a full-featured client for filesync that has these features:

* Automatic updates
* Native init scripts for all systems
    * Unix-like systems:
        * Systemd if supported
        * Upstart if supported
        * "Regular" init script as fallback
    * Windows:
        * Windows service
* Browser-based configuration
* Nearly instantaneous synchronization between client and server
* HTTP auth system- pam module (included) or windows credential provider
* Cross-platform install scripts based on npm

Installing
----------

    git clone git://github.com/beatgammit/filesync-client.git
    cd filesync-client
	npm install -g --unsafe-perm

Note, this needs to have real root permissions, hence the --unsafe-perm. If not, then the installer would not have permissions to automagically copy stuff where it needs to be (/lib, /etc, etc).

The install scripts are written in Python. The recommended version is Python 2.7.

The installer can take some command-line parameters. Currently supported parameters are:

* `--pam-module`- if present, compiles and "installs" the http pam module
* `--pam-module-path path`- the path for the http pam module, including the name of the module. Defaults to ./http-auth.so
* `--binroot path/to/dir`- where to install the server
* `--pam-path path/to/pam/dir`- where to put the pam module
* `--port 2000`- port of the server

Anything else may have undesired results. I use a couple parameters in development, and these should only be used with extreme care.

To install with parameters, do:

`npm install [parameters]`

So, to change the install port, do:

`npm install --port 4567`

Dependencies
------------

**Python Modules:**

* colorama- can be installed through `easy_install` or `pip`

**Installed Applications:** (in *commands*)

* gcc- for PAM module
* make- for PAM module
* redis (checks for redis-cli)- for storing watch/upload information

**Installed Libraries:** (in *libs*)

* libcurl- for PAM module

The required node modules are listed in the package.json.

Running
-------

filesync-client now supports npm start. Just do:

`npm start filesync-client` after npm installing it and the server will be run in the background on whatever port is in the package.json file. This is only really useful for testing purposes right now and there's no way to actually kill the server besides `kill PID`. It's just easier than doing `cd node_modules/filesync-client/bin/ ; ./filesync`.

This method will be obsolete when it's running as a background process, but for now, it's quite convenient. Just take out the & in the package.json if you don't want it to run in the background (even more convenience).

What works
----------

The install process for systemd-based systems seems to work. It hasn't been tested for an actual global install, but it seems to work fine with local installs.

Watching files works. For testing, edit bin/filesync and emit an 'addWatches' event with an array of the files/directories to watch. To see output, add a listener on 'newWatch', 'fileModified', and 'fileRemoved'. The following use-cases have been tested:

* vim- creates temp files; doesn't modify the original file (uses buffer file)
* echo- modifies the original file

What doesn't work
-----------------

Everything else.

Updating may work, but is untested. Upstart is not supported at all.
