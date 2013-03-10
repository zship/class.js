/*jshint strict:false*/
define(function(require) {

	var forOwn = require('mout/object/forOwn');
	var filter = require('mout/object/filter');
	var isFunction = require('mout/lang/isFunction');


	var superMethod = function() {
		var curr = this._super.curr;
		if (!curr) {
			curr = this._super.curr = {};
			//keep a pointer to which base class we're operating on, so that
			//upstream _super calls are directed to methods progressively
			//higher in the chain
			curr.pos = 0;
			//Function.caller is expensive. We can cache it across _super calls
			//within the same function chain (same-named)
			curr.key = superMethod.caller.nom;
		}

		var list = this.constructor._meta.superList;
		curr.fn = list[curr.key] && list[curr.key][curr.pos];
		curr.pos++;

		if (!curr.fn) {
			var className = this.constructor._meta.name;
			var err = className + '#' + curr.key + ': no method by this name in superclasses (';
			err += [className].concat(
				this.constructor._meta.bases.map(function(base) {
					return base._meta.name;
				})
			).join(' > ');
			err += ')';
			throw new Error(err);
		}

		var ret = curr.fn.apply(this, arguments);
		this._super.curr = null;
		return ret;
	};


	var makeSuper = function(constructor) {
		var meta = constructor._meta;
		var proto = constructor.prototype;

		//cache of which base methods should be used for each _super method,
		//and in what order
		meta.superList = {};

		forOwn(filter(meta.members, isFunction), function(member, key) {
			proto[key].nom = key;
			meta.superList[key] = meta.bases
				.filter(function(base) {
					return base._meta.members.hasOwnProperty(key);
				})
				.map(function(base) {
					return base._meta.members[key];
				});
		});

		proto._super = superMethod;
	};


	return makeSuper;

});
