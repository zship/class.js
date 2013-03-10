define(function(require) {

	'use strict';

	var forOwn = require('mout/object/forOwn');
	var isObject = require('mout/lang/isObject');
	var merge = require('mout/object/merge');
	var ObjectProxy = require('../util/ObjectProxy');


	var _defineProxy = function(context, descriptors) {
		return new ObjectProxy({
			context: context,
			target: context._data,
			descriptors: descriptors
		});
	};


	//clone descriptors, because ObjectProxy binds them to the `context` object
	var _clone = function(descriptors) {
		var result = {};
		Object.keys(descriptors).forEach(function(key) {
			var descriptor = descriptors[key];
			result[key] = {
				get: descriptor.get,
				set: descriptor.set
			};
		});
		return result;
	};


	var makeProps = function(constructor) {

		var meta = constructor._meta;
		var proto = constructor.prototype;

		meta.descriptors = {};
		meta.bases.slice(0).reverse().forEach(function(base) {
			meta.descriptors = merge(meta.descriptors, base._meta.descriptors);
		});

		//find members of proto which have 'get' and/or 'set' properties
		Object.keys(proto)
			.filter(function(key) {
				return (
					isObject(proto[key]) &&
					Object.keys(proto[key]).length <= 2 &&
					(
						proto[key].hasOwnProperty('get') ||
						proto[key].hasOwnProperty('set')
					)
				);
			})
			.forEach(function(key) {
				meta.descriptors[key] = meta.descriptors[key] || {};
				meta.descriptors[key].get = proto[key].get;
				meta.descriptors[key].set = proto[key].set;

				if (!proto[key].hasOwnProperty('set')) {
					meta.descriptors[key].set = function() {
						throw new Error(key + ' is a read-only property');
					};
				}
			});

		//if they don't exist, make placeholders for parents of nested
		//properties
		Object.keys(meta.descriptors)
			.filter(function(key) {
				return key.search(/\./) !== -1;
			})
			.forEach(function(key) {
				var parts = key.split('.');
				for (var i = 0, len = parts.length; i < len - 1; i++) {
					parts.pop();
					var path = parts.join('.');
					meta.descriptors[path] = meta.descriptors[path] || {};
					meta.descriptors[path].get = meta.descriptors[path].get || null;
					meta.descriptors[path].set = meta.descriptors[path].set || null;
				}
			});


		//if any properties have '.' in the name, they'll be accessed through an
		//ObjectProxy
		forOwn(meta.descriptors, function(descriptor, name) {
			var children = Object.keys(meta.descriptors).filter(function(key) {
				return (key.search(new RegExp('^' + name + '\\.')) !== -1);
			});

			if (children.length !== 0) {
				descriptor.hasChildren = true;
			}

			delete proto[name];
		});

		//make properties for direct children of proto, and proxies for deeper
		//children
		Object.keys(meta.descriptors)
			.filter(function(key) {
				//direct children of proto
				return key.search(/\./) === -1;
			})
			.forEach(function(key) {
				var descriptor = meta.descriptors[key];

				if (descriptor.hasChildren) {
					descriptor.get = function() {
						this._proxy = this._proxy || _defineProxy(this, _clone(meta.descriptors));
						return this._proxy[key];
					};

					descriptor.set = function(val) {
						this._proxy = this._proxy || _defineProxy(this, _clone(meta.descriptors));
						this._proxy[key]._set(val);
					};
				}

				Object.defineProperty(proto, key, {
					get: descriptor.get || function() {
						return this._data[key];
					},
					set: descriptor.set || function(val) {
						this._data[key] = val;
					}
				});
			});

	};


	return makeProps;

});
