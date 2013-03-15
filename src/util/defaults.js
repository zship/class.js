define(function(require) {

	'use strict';


	var forEach = require('mout/collection/forEach');
	var isObject = require('mout/lang/isObject');
	var isElement = require('./isElement');


	/**
	 * Combine properties from `sources` into `target`, recursively mixing
	 * child objects and skipping null/undefined values
	 * @param {Object} target
	 * @param {...Object} sources
	 * @return {Object}
	 */
	var defaults = function(target) {
		var i = 0;

		while(++i < arguments.length){
			var obj = arguments[i];
			if (obj !== null && obj !== undefined) {
				forEach(obj, function(val, key) {
					if (!target.hasOwnProperty(key)) {
						target[key] = {};
					}

					//deep merge only objects
					if (val && isObject(val) && !isElement(val)) {
						defaults(target[key], val);
					} else {
						target[key] = val;
					}
				});
			}
		}

		return target;
	};


	return defaults;

});
