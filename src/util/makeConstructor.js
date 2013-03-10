define(function(require) {

	'use strict';

	var forOwn = require('mout/object/forOwn');


	var makeConstructor = function(fn, proto, meta) {
		//proto.constructor is about to be overwritten. if plugins modified it,
		//save that modification in meta.ctor.
		meta.ctor = proto.constructor;

		var constructor = fn || function() {};
		constructor._meta = meta;
		constructor.prototype = proto;
		proto.constructor = constructor;

		forOwn(meta.statics, function(val, key) {
			constructor[key] = val;
		});

		return constructor;
	};


	return makeConstructor;

});
