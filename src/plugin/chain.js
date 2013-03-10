define(function(require) {

	'use strict';

	var forOwn = require('mout/object/forOwn');
	var merge = require('mout/object/merge');
	var toArray = require('mout/lang/toArray');
	var pipe = require('deferreds/pipe');


	var makeChains = function(constructor) {
		var meta = constructor._meta;
		var proto = constructor.prototype;

		meta.chains = meta.members.__chains || {};

		meta.bases.slice(0).reverse().forEach(function(base) {
			meta.chains = merge(meta.chains, base._meta.chains);
		});

		forOwn(meta.chains, function(type, key) {
			var bases = meta.bases.slice(0); //don't modify passed bases

			//first/last in the chain should be this constructor
			bases.unshift(constructor);

			if (type === 'after') {
				bases = bases.reverse();
			}

			proto[key] = function() {
				var args = toArray(arguments);

				bases = bases.filter(function(base) {
					return base._meta.members.hasOwnProperty(key);
				});

				var methods = bases.map(function(base) {
					return base._meta.members[key].bind(this);
				}.bind(this));

				if (args.length) {
					//first argument is passed as an argument to the first
					//method
					methods.unshift(args);
				}

				return pipe(methods);
			};
		});
	};


	return makeChains;

});
