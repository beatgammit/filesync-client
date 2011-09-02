(function () {
	'use strict';

	var fs = require('fs'),
		path = require('path'),
		Inotify = require('inotify-plusplus'),
		inotify = Inotify.create(true),
		eventhub = require('eventhub'),
		dirs = {},
		watches = {},
		createQueue = [],
		removeQueue = [],
		modifyQueue = [],
		createTimeout,
		removeTimeout,
		modifyTimeout,
		sleepTime = 100;

	/*
	 * Create event. Only works if it occurs on a watched directory.
	 *
	 * @param e- Event from inotify-plusplus
	 */
	function create(e) {
		var fullPath = path.join(e.watch, e.name);

		// if it's in a watched directory
		if (dirs[e.watch] === true || fullPath in watches) {
			// TODO: not sure if this will ever fail
			if (createQueue.indexOf(fullPath) < 0) {
				createQueue.push(fullPath);
			}
			addWatches(createQueue);
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

		// if it's in a watched directory or already in the set of watches
		if (dirs[e.watch] === true || fullPath in watches) {
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
		var fullPath = path.join(e.watch, e.name);

		if (dirs[e.watch] === true || fullPath in watches) {
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
	 * @filepath- Where the path is located; will be made absolute using cwd
	 */
	function addWatch(filepath) {
		var absPath = path.resolve(filepath);

		// we already exist, don't bother recreating
		if (watches[absPath]) {
			return;
		}

		fs.lstat(absPath, function (err, stat) {
			var tWatch, unwatch;

			// TODO: do something more useful here
			if (err) {
				console.error(err);
				return;
			}

			if (stat.isDirectory()) {
				tWatch = absPath;
				dirs[absPath] = true;
			} else {
				tWatch = path.resolve(path.dirname(filepath));
				dirs[tWatch] = false;
			}

			// add watch to parent directory (for VIM compatibility)
			unwatch = inotify.watch({
				'close_write': modify,
				'moved_from': remove,
				'moved_to': create,
				'create': create,
				'delete': remove
			}, tWatch);

			watches[absPath] = {
				stat: stat,
				unwatch: unwatch
			};

			// TODO: mark for upload

			console.log('Watch added:', absPath);
		});
	}

	/*
	 * Adds an array of watches.
	 *
	 * Watches are added after a small timeout to avoid delete-recreate sequences.
	 *
	 * @param watches- Array of watches
	 */
	function addWatches(watches) {
		if (createTimeout) {
			clearTimeout(createTimeout);
			createTimeout = null;
		}

		// small timeout to account for moving on top of a watched file
		createTimeout = setTimeout(function () {
			var watch, i;

			createTimeout = null;

			while(watches.length) {
				watch = watches.pop();
				i = removeQueue.indexOf(watch);
				if (i >= 0) {
					removeQueue.splice(i, 1);
				} else {
					addWatch(watch);
				}
			}
		}, sleepTime);
	}

	function modifyWatch(filepath) {
		var absPath = path.resolve(filepath);

		fs.lstat(absPath, function (err, stat) {
			var tWatch;

			// TODO: do something more useful here
			if (err) {
				console.error(err);
				return;
			}

			// update stat information
			if (watches[absPath]) {
				watches[absPath].stat = stat;
			}

			// TODO: mark for upload

			console.log('Watch modified:', absPath);
		});
	}

	function modifyWatches(watches) {
		if (modifyTimeout) {
			clearTimeout(modifyTimeout);
			modifyTimeout = null;
		}

		// small timeout so we avoid IO during heavy IO
		modifyTimeout = setTimeout(function () {
			var watch;

			modifyTimeout = null;

			while(watches.length) {
				watch = watches.pop();
				modifyWatch(watch);
			}
		}, sleepTime);
	}

	/*
	 * Remove a watch.
	 *
	 * @filepath- Where the path is located; will be made absolute using cwd
	 */
	function removeWatch(filepath) {
		var absPath = path.resolve(filepath);

		// if it isn't an explicitly added watch (file, not directory), return
		if (!watches[absPath]) {
			return;
		}

		watches[absPath].unwatch();
		delete watches[absPath];

		console.log('Watch removed:', absPath);
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
			removeTimeout = null;
		}

		// small timeout to account for moving on top of a watched file
		removeTimeout = setTimeout(function () {
			var watch, i;

			removeTimeout = null;

			while(watches.length) {
				watch = watches.pop();
				i = createQueue.indexOf(watch);
				if (i >= 0) {
					createQueue.splice(i, 1);
				} else {
					removeWatch(watch);
				}
			}
		}, sleepTime);
	}

	eventhub.on('addWatches', addWatches);
	eventhub.on('removeWatches', removeWatches);
}());
