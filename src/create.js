/*jshint evil:true, strict:false */
define(function(require) {

	var basicCreate = require('./basicCreate');
	var makeConstructor = require('./util/makeConstructor');
	var forceNew = require('./util/forceNew');
	var defaults = require('./util/defaults');
	var plugin = {
		apply: require('./plugin/apply'),
		chain: require('./plugin/chain'),
		clone: require('./plugin/clone'),
		guessName: require('./plugin/guessName'),
		_super: require('./plugin/super2'),
		props: require('./plugin/props')
	};


	//the actual constructor function (invoked with the `new` operator)
	var ctorFn = function(meta) {
		return function $Class(other) {
			//signal minifiers to avoid mangling names in this eval'd scope
			eval('');

			//this following is eval'd from class/create, in order
			//to override the constructor name given in common debuggers
			//more: http://stackoverflow.com/questions/8073055/minor-drawback-with-crockford-prototypical-inheritance/8076515
		
			if(!(this instanceof $Class)){
				// not called via new, so force it
				var instance = forceNew($Class);
				$Class.apply(instance, arguments);
				return instance;
			}

			//copy constructor for instances of this or any superclasses
			if (arguments.length === 1 && (other.constructor === $Class || meta.bases.indexOf(other.constructor) !== -1)) {
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

		var constructor = basicCreate.apply(undefined, arguments);
		var proto = constructor.prototype;
		var meta = constructor._meta;


		/*
		 * ----------------------------------------------------------------------
		 * Step 2:
		 * Augment the constructor's prototype object or `_meta` metadata
		 * ----------------------------------------------------------------------
		 */

		//_super() method
		plugin._super(constructor);

		//clone() method
		plugin.clone(constructor);

		//_apply() method
		plugin.apply(constructor);

		//AOP-style 'after' or 'before' method chaining
		plugin.chain(constructor);

		//ES5 properties for members like {get: fn, set: fn}
		plugin.props(constructor);

		//attempt to guess class name from source
		plugin.guessName(constructor);

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
			eval('1&&function ' + ctorFn(meta).toString().replace(/\$Class/g, meta.name).replace(/^function\s+/, '')),
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
