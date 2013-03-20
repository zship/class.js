/*jshint strict:false*/
define(function(require) {

	var stacktrace = require('stacktrace');


	/*
	 * Convention: if the result of the call to create() or extend() is
	 * assigned to a variable, we use that name as the class name
	 */
	var guessName = function(constructor) {
		//name manually specified
		if (constructor._meta.name) {
			return;
		}

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

		var declarationPos = guessNamePos + 3;
		var parts = stack[declarationPos].match(/^.*?((?:file|http|https):\/\/.*?\/.*?)(?::(\d+)).*/);
		var file = parts[1];
		var source = trace.getSource(file);

		if (!source || !source.length) {
			return;
		}

		var lineno = parts[2];
		var line = source[lineno - 1];

		//e.g. var (name) = (Superclass).extend({...
		var rClassExtend = /^\s*?(?:var)?\s*?(\S+?)\s*?=\s*?(\S+?)\.extend/;
		var matches = line.match(rClassExtend);

		if (!matches) {
			return;
		}

		constructor._meta.name = matches[1];

	};


	return guessName;

});
