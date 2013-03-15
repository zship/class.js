define(function(require) {

	'use strict';


	var isElement = require('../util/isElement');
	var forOwn = require('mout/object/forOwn');
	var kindOf = require('mout/lang/kindOf');
	var isFunction = require('mout/lang/isFunction');


	//modified from mout's lang/clone
	function clone(val){
		var result;

		//don't clone DOM nodes (or jquery objects)
		if (isElement(val)) {
			result = val;
			return result;
		}

		switch ( kindOf(val) ) {
			case 'Object':
				result = cloneObject(val);
				break;
			case 'Array':
				result = cloneArray(val);
				break;
			case 'RegExp':
				result = cloneRegExp(val);
				break;
			case 'Date':
				result = cloneDate(val);
				break;
			default:
				result = val;
		}

		return result;
	}


	function cloneObject(source) {
		//object with a clone() method: respect its clone method
		//(should return a true instance of something, rather than a
		//plain object like cloneObject)
		if (source.clone && isFunction(source.clone)) {
			return source.clone();
		}

		var out = {};
		forOwn(source, function(val, key) {
			out[key] = clone(val);
		});
		return out;
	}


	function cloneRegExp(r){
		var flags = '';
		flags += r.multiline ? 'm' : '';
		flags += r.global ? 'g' : '';
		flags += r.ignoreCase ? 'i' : '';
		return new RegExp(r.source, flags);
	}


	function cloneDate(date){
		return new Date( date.getTime() );
	}


	function cloneArray(arr){
		var out = [];
		var i = -1;
		var n = arr.length;
		while (++i < n) {
			out[i] = clone(arr[i]);
		}
		return out;
	}


	var makeClone = function(constructor) {
		var proto = constructor.prototype;

		proto.clone = function() {
			var ret = Object.create( Object.getPrototypeOf(this) );
			forOwn(this, function(val, key) {
				ret[key] = clone(val);
			});
			return ret;
		};
	};


	return makeClone;

});
