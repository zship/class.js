define(function(require) {

	var forOwn = require('mout/object/forOwn');


	var makeConstructor = function(fn, proto, meta) {
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
