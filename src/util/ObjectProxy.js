define(function(require) {

	var isObject = require('mout/lang/isObject');
	var forOwn = require('mout/object/forOwn');
	var size = require('mout/object/size');


	var ObjectProxy = function(opts) {

		if (!opts.target) {
			this._data = {
				target: opts,
				props: {},
				descriptors: {},
				proxies: {}
			};
		}
		else {
			this._data = {
				key: opts.key,
				isChild: opts.isChild,
				context: opts.context,
				target: opts.target,
				props: {},
				descriptors: opts.descriptors || {},
				proxies: {}
			};
		}

		Object.keys(this._data.target).forEach(function(key) {
			this._data.props[key] = true;
		}.bind(this));

		//add properties to the tree which were defined in descriptors but may
		//not yet exist in target
		if (this._data.descriptors && !this._data.isChild) {
			forOwn(this._data.descriptors, function(descriptor, key) {
				this._data.props[key] = true;
				//this._data.tree.setNode(key, null);

				//bind all descriptors to opts.context, if given
				if (descriptor.get && this._data.context) {
					descriptor.get = descriptor.get.bind(this._data.context);
				}

				if (descriptor.set && this._data.context) {
					descriptor.set = descriptor.set.bind(this._data.context);
				}
			}.bind(this));
		}

		this._defineProps();

	};


	var _subProps = function(name, props) {
		var ret = {};
		var rSubName = new RegExp('^' + name + '\\.');

		Object.keys(props).filter(function(key) {
			return (key.search(rSubName) !== -1);
		}).forEach(function(key) {
			var shortName = key.replace(rSubName, '');
			ret[shortName] = props[key];
		});

		return ret;
	};


	ObjectProxy.prototype._defineProps = function() {
		forOwn(this._data.props, function(obj, key) {
			if (key.search(/\./g) !== -1) {
				return;
			}

			var descriptor = {};

			if (isObject(this._data.target[key]) && size(this._data.target[key])) {
				this._data.proxies[key] = this._data.proxies[key] || new ObjectProxy({
					key: key,
					isChild: true,
					context: this._data.context,
					target: this._data.target[key],
					descriptors: _subProps(key, this._data.descriptors),
					props: _subProps(key, this._data.props)
				});

				descriptor.get = function() {
					return this._data.proxies[key];
				};
			}
			else {
				descriptor.get = (this._data.descriptors[key] && this._data.descriptors[key].get) || function() {
					return this._data.target[key];
				};
			}

			descriptor.set = this._set.bind(this, key);
			descriptor.configurable = true;

			Object.defineProperty(this, key, descriptor);
		}.bind(this));
	};


	//recursively set children of the current target
	ObjectProxy.prototype._set = function(key, val) {

		if (arguments.length === 1) {
			val = key;
			key = null;
		}

		//setting properties on this._data.target directly
		if (!key) {
			forOwn(val, function(obj, key) {
				this._set(key, obj);
			}.bind(this));
			return;
		}

		//setting a child of this._data.target

		//new property added. set new sub-proxy.
		if (isObject(val) && !isObject(this._data.target[key])) {
			this._data.target[key] = val;
			this._defineProps();
			this._data.proxies[key]._set(val);
			return;
		}

		if (isObject(val)) {
			this._data.proxies[key]._set(val);
			return;
		}

		var setter = (this._data.descriptors[key] && this._data.descriptors[key].set) ||
			function(val) {
				this._data.target[key] = val;
			}.bind(this);
		setter(val);

	};


	return ObjectProxy;

});
