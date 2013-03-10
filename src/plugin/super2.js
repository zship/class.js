define(function(require) {

	'use strict';

	var forOwn = require('mout/object/forOwn');
	var filter = require('mout/object/filter');
	var isFunction = require('mout/lang/isFunction');


	//implements a classical-oop "super" method
	//super2 is a version which allows client code to run in es5 "strict mode"
	var superMethod = function(superList, key) {
		//keep a pointer to which base class we're operating on, so that
		//upstream _super calls are directed to methods progressively
		//higher in the chain
		var superPointer = 0;

		var ret = function() {
			var superFn = superList[superPointer];
			superPointer++;

			if (!superFn) {
				var className = this.constructor._meta.name;
				var err = className + '#' + key + ': no method by this name in superclasses (';
				err += [className].concat(
					this.constructor._meta.bases.map(function(base) {
						return base._meta.name;
					})
				).join(' > ');
				err += ')';
				throw new Error(err);
			}

			var ret = superFn.apply(this, arguments);
			superPointer = 0;
			return ret;
		};

		ret.nom = key;
		return ret;
	};


	var makeSuper = function(constructor) {
		var meta = constructor._meta;
		var proto = constructor.prototype;

		meta.superCache = {};

		forOwn(filter(meta.members, isFunction), function(member, key) {
			var superList = meta.bases
				.filter(function(base) {
					return base._meta.members.hasOwnProperty(key);
				})
				.map(function(base) {
					return base._meta.members[key];
				});

			meta.superCache[key] = superMethod(superList, key);

			proto[key] = function() {
				if (!this._super || this._super.nom !== key) {
					this._super = meta.superCache[key];
				}
				return member.apply(this, arguments);
			};
		});
	};


	return makeSuper;

});
