define(function() {

	var _hashCode = function(str){
		var hash = 0;

		if (str.length === 0) {
			return hash;
		}

		for (var i = 0; i < str.length; i++) {
			var char = str.charCodeAt(i);
			hash = ((hash<<5)-hash)+char;
			hash = hash & hash; // Convert to 32bit integer
		}

		return hash.toString();
	};


	var count = {};
	var lastMatches = {};
	var lastCaller;


	/*
	 * Convention: if the result of the call to create() or extend() is
	 * assigned to a variable, we use that name as the class name
	 */
	var guessClassName = function(constructor) {
		var meta = constructor._meta;

		var caller = guessClassName.caller.caller;
		lastCaller = lastCaller || caller;

		var changedScope = true;
		var curr = caller;
		for (var i = 0; i < 10; i++) {
			if (curr === lastCaller) {
				changedScope = false;
				break;
			}
			if (curr.caller === null) {
				break;
			}
			curr = curr.caller;
		}

		//when we move out of scope of a group of classes, we can delete our
		//caches pertaining to them
		if (changedScope) {
			count = {};
			lastMatches = {};
			lastCaller = caller;
		}

		var sCaller = caller.toString();

		//store count of class declarations we have already processed in `caller`'s
		//scope. We'll keep looking until we've exceeded this count in `hits` below.
		var hash = _hashCode(sCaller);
		count[hash] = count[hash] || 0;
		lastMatches[hash] = lastMatches[hash] || [];

		//mark an explicitly-named class, and increment the count of guessed
		//class names (guessClassName holds a good bit of state, so it's for
		//the next invocation)
		if (meta.name) {
			count[hash]++;
			lastMatches[hash][count[hash]] = '';
			return;
		}

		var superclassName = '';
		if (meta.bases && meta.bases.length) {
			superclassName = meta.bases[0]._meta.name;
		}

		//e.g. var (name) = create({...
		var rClassCreate = /^\s*?(?:var)?\s*?(\S+?)\s*?=\s*?create/;
		//e.g. var (name) = (Superclass).extend({...
		var rClassExtend = /^\s*?(?:var)?\s*?(\S+?)\s*?=\s*?(\S+?)\.extend/;

		var lines = sCaller.split(/\n/);
		var hits = 0;
		for (var j = 0; j < lines.length; j++) {
			var line = lines[j];

			if (line === lastMatches[hash][hits]) {
				hits++;
				continue;
			}

			var matches = line.match(rClassCreate);

			if (!matches) {
				matches = line.match(rClassExtend);
				//it's an extend() match, but not with the superclass name
				//we're looking for (extend is a somewhat common function name,
				//so we're being precise with this match)
				if (matches && matches[2] !== superclassName) {
					matches = false;
				}
			}

			if (!matches) {
				continue;
			}

			hits++;

			//discard matches we've already assigned to classes (returned from
			//this method)
			if (hits <= count[hash]) {
				continue;
			}

			meta.name = matches[1];
			lastMatches[hash][count[hash]] = line;
			count[hash]++;
			return;
		}
	};


	return guessClassName;

});
