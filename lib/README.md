File Overview
=============

Each file represents a logical component of the application.  Each file has a distint role and communicates to other pieces through events (sending messages).

Obviously, there is a little overhead with this model, but it makes everything much simpler, and makes it easier to port individual components to a compiled module.

The individual components are:

* index.js- Interface to other components. Components can be 'enabled' or 'disabled' by modifying this file.
* server.js- Provides API interface and basic static file serving for a GUI.
  * Files for the GUI are in public/
* filewatcher.js- Watches files and notifies the application when they are changed.
* updater.js- Handles automatic updates through NPM.

All components communicate over an eventhub, which is a convenient way of passing EventEmitters and general events to other parts of the program.

server
======

Doesn't do anything too interesting, but provides a way to stop the server.

Currently supported resources are:

* /cwd- the current working directory
* /dir- returns the directory name of the server module
* /stop- stop the server (e.g. `curl -X PUT http://localhost:2500/stop`)

The server also listens on a 'createRoute' event, which accepts three parameters:

* route- route to listen on
* method- what type of requests to handle (default 'get')
* handler- function to call:
  * request- HTTP request object from Node
  * response- HTTP response object
  * next- callback to defer to the next object on the stack

Anything else is assumed to be a request for a static file.

filewatcher
===========

Watches files for events, and filters events to be as intelligent as possible.

Many programs do 'in-place' modifications, so for that case, filewatcher waits for a 'close write' notification.

However, other programs modify a temporary file and then move this file onto the original file (to reduce the likelihood of data corruption).  This complicates things, because many of these programs follow this basic structure:

1. Store edits in memory or temporary file (create file)
2. Flush all changes to temporary file (close write)
3. Move temporary file on top of actual file (delete original, create original, close write original)

To account for this case, filewatcher tries to be intelligent. Every time an interesting event fires, filewatcher adds that file to a queue based on the type of event:

* create- 'create' or 'move to' events
* modify- only 'close write' events are listened to
* remove- 'move from' or 'delete' events

In order to emit only a single event for a logical file modification, remove and create events cancel each other out. This is implemented with timeouts. Each group has the same timeout, which is intentionally pretty small. If a create event is fired before the file is removed, then both events are removed (timeouts not reset).

In order to keep this consistent (say three events are edited in this way consecutively before the timeout expires), every time an event is fired (any file), that group's timeout is reset. This is meant to allow the application to be as robust as possible with minimal logic. This also has the added benefit that no files are processed if the user is editing large amounts of data at the same time (copying/deleting lots of files). This does, however, mean that all modifications will not be synchronized until file activity stops (which could be good or bad).

updater
=======

Updates are handled through NPM. This makes the logic of maintaining updates very simple.

The updater module checks NPM periodically for updates. Once an update is available, the updater module goes ahead and updates the application, then emits an event notifying the application. The application should then try to finish whatever is being done and restart itself.

This module is not to be considered finished and is not tested. Certain factors that should be taken into account are not:

* UI could be updated while the server is not
* Updates should not be requested/applied during high strain
* The main application should be asked whether to install the update
