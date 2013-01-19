define(function(require) {

	var forOwn = require('mout/object/forOwn');
	var isFunction = require('mout/lang/isFunction');


	var superMethod = function() {
		//keep a pointer to which base class we're operating on, so that
		//upstream _super calls are directed to methods higher in the chain
		this._superPointer = this._superPointer || 0;
		this._superPointer++;

		var key = superMethod.caller.nom;
		var cache = this.constructor._meta.superCache;
		var superFn = cache[key] && cache[key][this._superPointer - 1];

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
		this._superPointer = 0;
		return ret;
	};


	var makeSuper = function(constructor) {
		var meta = constructor._meta;
		var proto = constructor.prototype;

		forOwn(proto, function(prop, key) {
			if (isFunction(prop)) {
				prop.nom = key;
			}
		});

		//cache of which base methods should be used for each _super method,
		//and in what order
		meta.superCache = {};

		forOwn(meta.members, function(member, key) {
			meta.superCache[key] = [];
			meta.bases.forEach(function(base) {
				if (!base._meta.members.hasOwnProperty(key)) {
					return;
				}

				var fn = base._meta.members[key];

				if (!fn) {
					return;
				}

				meta.superCache[key].push(fn);
			});
		});

		proto._super = superMethod;
	};


	return makeSuper;

});
