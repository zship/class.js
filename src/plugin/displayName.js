define(function(require) {

	'use strict';

	var forOwn = require('mout/object/forOwn');
	var isFunction = require('mout/lang/isFunction');


	var makeDebug = function(constructor) {

		var meta = constructor._meta;
		var proto = constructor.prototype;

		forOwn(proto, function(val, key) {
			if (isFunction(val)) {
				val.displayName = meta.name + '#' + key;
			}
		});

		forOwn(constructor, function(val, key) {
			if (isFunction(val)) {
				val.displayName = meta.name + '.' + key;
			}
		});

	};


	return makeDebug;

});
