/*jshint evil:true */
define(function(require) {

	var base = require('./base');
	var makeConstructor = require('./makeConstructor');
	var forceNew = require('./util/forceNew');
	var defaults = require('./util/defaults');
	var guessClassName = require('plugin/guessClassName');
	var makeSuper = require('plugin/makeSuper');
	var makeClone = require('plugin/makeClone');
	var makeApply = require('plugin/makeApply');
	var makeChains = require('plugin/makeChains');
	var makeProps = require('plugin/makeProps');


	var ctorFn = function(meta) {
		return function(other) {
			//signal minifiers to avoid mangling names in this eval'd scope
			eval('');

			//this following is eval'd from joss/oop/classes/create, in order
			//to override the constructor name given in common debuggers
			//more: http://stackoverflow.com/questions/8073055/minor-drawback-with-crockford-prototypical-inheritance/8076515
		
			if(!(this instanceof arguments.callee)){
				// not called via new, so force it
				var instance = forceNew(arguments.callee);
				arguments.callee.apply(instance, arguments);
				return instance;
			}

			//copy constructor for instances of this or any superclasses
			if (arguments.length === 1 && (other.constructor === arguments.callee || meta.bases.indexOf(other.constructor) !== -1)) {
				this._data = other.clone()._data;
				return;
			}

			//special _data member of each class is, by convention, used to
			//hold all instance-specific "private" data.
			this._data = defaults({}, meta.defaults);

			//give user the opportunity to override return value
			return meta.ctor.apply(this, arguments);
		};
	};


	/**
	 * @param {String} [className]
	 * @param {...Constructor} [superclasses]
	 * @param {Object} members
	 * @return {Constructor}
	 */
	var create = function() {

		/*
		 * ----------------------------------------------------------------------
		 * Step 1:
		 * Make a basic constructor with just inheritance info
		 * ----------------------------------------------------------------------
		 */

		var constructor = base.apply(undefined, arguments);
		var proto = constructor.prototype;
		var meta = constructor._meta;


		/*
		 * ----------------------------------------------------------------------
		 * Step 2:
		 * Augment the constructor's prototype object or `_meta` metadata
		 * ----------------------------------------------------------------------
		 */

		//_super() method
		makeSuper(constructor);

		//clone() method
		makeClone(constructor);

		//_apply() method
		makeApply(constructor);

		//AOP-style 'after' or 'before' method chaining
		makeChains(constructor);

		//ES5 properties for members like {get: fn, set: fn}
		makeProps(constructor);

		//attempt to guess class name from source
		guessClassName(constructor);

		//initialize the `_data` member upon construction
		meta.defaults = meta.members.__defaults || {};


		/*
		 * ----------------------------------------------------------------------
		 * Step 3:
		 * Replace the basic constructor
		 * ----------------------------------------------------------------------
		 */

		constructor = makeConstructor(
			//see ctorFn() above for explanation of why eval() is used here
			eval('1&&function ' + (meta.name || '') + ctorFn(meta).toString().replace(/^function\s+/, '')),
			proto,
			meta
		);


		/*
		 * ----------------------------------------------------------------------
		 * Step 4:
		 * Augment the constructor with any new static methods
		 * ----------------------------------------------------------------------
		 */

		constructor.extend = create.bind(create, constructor);

		return constructor;

	};


	return create;

});
