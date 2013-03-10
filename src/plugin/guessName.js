/*jshint strict:false*/
define(function(require) {

	var stacktrace = require('stacktrace');


	/*
	 * Convention: if the result of the call to create() or extend() is
	 * assigned to a variable, we use that name as the class name
	 */
	var guessName = function(constructor) {
		var trace = new stacktrace.implementation();
		var stack = trace.run(null);

		var guessNamePos;
		stack.every(function(line, i) {
			if (line.search(/\/plugin\/guessName\.js/) !== -1) {
				guessNamePos = i;
				return false;
			}
			return true;
		});

		if (!guessNamePos) {
			return;
		}

		var declarationPos = guessNamePos + 2;
		var parts = stack[declarationPos].match(/^.*?\((.*?)(?::(\d+))(?::(\d+))/);

		if (!parts) {
			parts = stack[declarationPos].match(/^\s*at\s*(.*?)(?::(\d+))(?::(\d+))$/);
		}

		var file = parts[1];
		var source = trace.getSource(file);

		if (!source || !source.length) {
			return;
		}

		var lineno = parts[2];
		var line = source[lineno - 1];

		//e.g. var (name) = create({...
		var rClassCreate = /^\s*?(?:var)?\s*?(\S+?)\s*?=\s*?create/;
		//e.g. var (name) = (Superclass).extend({...
		var rClassExtend = /^\s*?(?:var)?\s*?(\S+?)\s*?=\s*?(\S+?)\.extend/;

		var matches = line.match(rClassCreate);

		if (!matches) {
			matches = line.match(rClassExtend);
		}

		if (!matches) {
			return;
		}

		constructor._meta.name = matches[1];

	};


	return guessName;

});
