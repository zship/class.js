define(function(require) {

	'use strict';


	var forOwn = require('mout/object/forOwn');
	var filter = require('mout/object/filter');


	var makeApply = function(constructor) {
		var proto = constructor.prototype;

		proto._apply = function(opts) {
			var descriptors = this.constructor._meta.descriptors;

			opts = filter(opts, function(val) {
				return val !== undefined && val !== null;
			});

			//set _data before calling setters, in case setter refers to other
			//properties in _data
			forOwn(opts, function(val, key) {
				if (descriptors[key]) {
					this._data[key] = opts[key];
				}
			}.bind(this));

			forOwn(opts, function(val, key) {
				if (descriptors[key] && descriptors[key].set) {
					descriptors[key].set.call(this, val);
				}
			}.bind(this));
		};
	};


	return makeApply;

});
