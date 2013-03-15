define(function(require) {

	'use strict';

	var toArray = require('mout/lang/toArray');
	var isString = require('mout/lang/isString');
	var forOwn = require('mout/object/forOwn');
	var methodResolutionOrder = require('./methodResolutionOrder');
	var makeConstructor = require('./makeConstructor');


	/**
	 * @param {String} [className]
	 * @param {...Constructor} [superclasses]
	 * @param {Object} members
	 * @return {Constructor}
	 */
	var base = function() {

		var args = toArray(arguments);
		var className;
		var superclasses = [];
		var members;

		if (isString(args[0])) {
			className = args[0];
			args.shift();
		}

		if (args[0]._meta) {
			superclasses = args.slice(0, -1);
			args = args.slice(-1);
		}

		members = args[0];


		/*
		 * ----------------------------------------------------------------------
		 * Step 1:
		 * Determine inheritance heirarchy and store linearized version in
		 * `bases`, in order from subclass to superclass.
		 * ----------------------------------------------------------------------
		 */
		var bases = [];

		if (superclasses.length === 1) {
			var superclass = superclasses[0];
			bases = [superclass].concat(superclass._meta.bases);
		}
		else if (superclasses.length > 1) {
			//methodResolutionOrder works on constructors. pass an object
			//mimicking a real constructor
			bases = methodResolutionOrder({
				_meta: {
					bases: superclasses
				}
			});
			bases.shift(); //first result is the constructor itself
		}


		/*
		 * ----------------------------------------------------------------------
		 * Step 2:
		 * Build prototype by mixing-in members in `bases`, and then mixing-in
		 * passed `members`
		 * ----------------------------------------------------------------------
		 */
		var proto = {};

		bases
			.slice(0)
			.reverse()
			.map(function(base) {
				return base._meta.members;
			})
			.concat([members])
			.forEach(function(props) {
				forOwn(props, function(prop, key) {
					proto[key] = prop;
				});
			});


		/*
		 * ----------------------------------------------------------------------
		 * Step 3:
		 * Gather introspection info in the `meta` variable. This will be added
		 * to the final constructor.
		 * ----------------------------------------------------------------------
		 */
		var meta = {};
		meta.name = className;
		meta.bases = bases;
		meta.members = members;

		//any "static" methods defined directly on a base constructor
		meta.statics = {};
		meta.bases.slice(0).reverse().forEach(function(base) {
			forOwn(base, function(val, key) {
				if (key === '_meta') {
					return;
				}
				meta.statics[key] = val;
			});
		});

		//the user-supplied constructor
		meta.ctor = function() {};
		if (members.hasOwnProperty('constructor')) {
			meta.ctor = members.constructor;
		}
		//if one wasn't provided, use the nearest superclass' ctor
		else {
			meta.bases.every(function(base) {
				if (base._meta.ctor) {
					meta.ctor = base._meta.ctor;
					return false;
				}
				return true;
			});
		}


		/*
		 * ----------------------------------------------------------------------
		 * Step 4:
		 * Build the constructor function
		 * ----------------------------------------------------------------------
		 */
		return makeConstructor(meta.ctor, proto, meta);

	};


	return base;

});
