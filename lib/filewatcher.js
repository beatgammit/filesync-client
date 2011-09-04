/*
 * Keeps track of file changes through inotify and emits events.
 *
 * Files are tracked by their parent directories, and directories
 * are tracked directly. This is done to be intelligent about files
 * that are modified by writing to a buffer file then replacing the
 * original.
 *
 * No information except paths is kept track of here.
 */
(function () {
	'use strict';

	var fs = require('fs'),
		path = require('path'),
		Inotify = require('inotify-plusplus'),
		inotify = Inotify.create(true),
		eventHub = require('eventhub'),
		watches = {},
		createQueue = [],
		removeQueue = [],
		modifyQueue = [],
		createTimeout,
		removeTimeout,
		modifyTimeout,
		sleepTime = 100;

	/*
	 * Watches are added after a small timeout to avoid delete-recreate sequences.
	 *
	 * @param watches- Array of watches
	 */
	function createWatches(watches) {
		if (createTimeout) {
			clearTimeout(createTimeout);
		}

		// small timeout to account for moving on top of a watched file
		createTimeout = setTimeout(function () {
			var watch;

			createTimeout = null;
			while (watches.length) {
				watch = path.resolve(watches.pop());
				eventHub.emit('newFile', watch);
			}
		}, sleepTime);
	}

	function modifyWatches(watches) {
		if (modifyTimeout) {
			clearTimeout(modifyTimeout);
		}

		// small timeout so we avoid IO during heavy IO
		modifyTimeout = setTimeout(function () {
			var watch;

			modifyTimeout = null;
			while (watches.length) {
				watch = path.resolve(watches.pop());
				eventHub.emit('fileModified', watch);
			}
		}, sleepTime);
	}

	/*
	 * Removes an array of watches.
	 *
	 * Watches are removed after a small timeout to avoid delete-recreate sequences.
	 * The array passed in will be modified.
	 *
	 * @param watches- Array of watches
	 */
	function removeWatches(watches) {
		if (removeTimeout) {
			clearTimeout(removeTimeout);
		}

		// small timeout to account for moving on top of a watched file
		removeTimeout = setTimeout(function () {
			var watch;

			removeTimeout = null;
			while (watches.length) {
				watch = path.resolve(watches.pop());
				if (watches[watch]) {
					// execute the unwatch handler and delete
					watches[watch]();
					delete watches[watch];
				}
				eventHub.emit('fileRemoved', watch);
			}
		}, sleepTime);
	}

	/*
	 * Create event. Only works if it occurs on a watched directory.
	 *
	 * @param e- Event from inotify-plusplus
	 */
	function create(e) {
		var fullPath = path.join(e.watch, e.name), i;

		// if it's in a watched directory or in the set of watches
		if (watches[e.watch] || watches[fullPath]) {
			// TODO: not sure if this will ever fail
			if (createQueue.indexOf(fullPath) < 0) {
				createQueue.push(fullPath);
			}
			
			// just in case the file was moved onto
			i = removeQueue.indexOf(fullPath);
			if (i >= 0) {
				removeQueue.splice(i, 1);
			}

			createWatches(createQueue);
		}
	}

	/*
	 * Modify event handler.
	 * If file is in a watched directory, or if file is itself watched,
	 * the file is marked for upload.
	 *
	 * @param e- Event from inotify-plusplus
	 */
	function modify(e) {
		var fullPath = path.join(e.watch, e.name);

		// if it's in a watched directory or in the set of watches
		if (watches[e.watch] || watches[fullPath]) {
			// if it's already in the queue, don't push another
			// we'll still call modifyWatches though
			if (modifyQueue.indexOf(fullPath) < 0) {
				modifyQueue.push(fullPath);
			}
			modifyWatches(modifyQueue);
		}
	}

	/*
	 * File removal event handler (delete, move).
	 * This removes the watch if the watch itself exists.
	 *
	 * @param e- Event from inotify-plusplus
	 */
	function remove(e) {
		var fullPath = path.join(e.watch, e.name), i;

		// if it's in a watched directory or in the set of watches
		if (watches[e.watch] || watches[fullPath]) {
			i = modifyQueue.indexOf(fullPath);
			if (i >= 0) {
				modifyQueue.splice(i, 1);
			}

			// just in case the file was temporary
			i = createQueue.indexOf(fullPath);
			if (i >= 0) {
				createQueue.splice(i, 1);
				return;
			}

			// TODO: not sure if this will ever fail
			if (removeQueue.indexOf(fullPath) < 0) {
				removeQueue.push(fullPath);
			}

			removeWatches(removeQueue);
		}
	}

	/*
	 * Add a watch.
	 *
	 * @param filepath- Where the path is located; will be made absolute using cwd
	 */
	function addWatch(filepath) {
		var absPath = path.resolve(filepath),
			dirPath = path.dirname(absPath);

		// if exists or is in a watched directory, don't bother recreating
		if (watches[absPath]) {
			return;
		} else if (watches[dirPath]) {
			eventHub.emit('newFile', absPath);
			return;
		}

		fs.lstat(absPath, function (err, stat) {
			var tWatch;

			// TODO: do something more useful here
			if (err) {
				console.error('Watch not added, stat failed:', err);
				return;
			}

			// add watch to parent directory if it's a file (vim compat)
			if (stat.isDirectory()) {
				tWatch = absPath;
			} else {
				tWatch = path.resolve(path.dirname(filepath));
			}

			watches[absPath] = inotify.watch({
				'close_write': modify,
				'moved_from': remove,
				'moved_to': create,
				'create': create,
				'delete': remove
			}, tWatch);

			eventHub.emit('newFile', absPath);
		});
	}

	eventHub.on('addWatches', function (watches) {
		watches.forEach(addWatch);
	});
	eventHub.on('removeWatches', removeWatches);
}());
