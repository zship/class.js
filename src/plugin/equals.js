define(function(require) {

	'use strict';


	var isElement = require('../util/isElement');
	var moutKindOf = require('mout/lang/kindOf');
	var isFunction = require('mout/lang/isFunction');


	function kindOf(obj) {
		if (isElement(obj)) {
			return 'Element';
		}
		else {
			return moutKindOf(obj);
		}
	}


	function equals(a, b) {
		if (a === b) {
			return true;
		}

		if (kindOf(a) !== kindOf(b)) {
			return false;
		}

		switch ( kindOf(a) ) {
			//DOM nodes (or jquery objects)
			case 'Element':
				//possible jQuery object
				if (a[0] && b[0]) {
					return arrayEquals(a, b);
				}
				//we don't recurse into DOM nodes, and `a === b` check was already
				//done above
				return false;
			case 'Object':
				//object with an equals() method
				if (a.equals && isFunction(a.equals)) {
					return a.equals(b);
				}
				return objectEquals(a, b);
			case 'Array':
				return arrayEquals(a, b);
			case 'Null':
				return true; //null is equal to null
		}

		return false;
	}


	function objectEquals(a, b) {
		var keysA = Object.keys(a);
		var keysB = Object.keys(b);

		if (keysA.length !== keysB.length) {
			return false;
		}

		var i;
		var len;
		var key;

		for (i = 0, len = keysB.length; i < len; i++) {
			key = keysB[i];
			if (!a.hasOwnProperty(key)) {
				return false;
			}
		}

		for (i = 0, len = keysA.length; i < len; i++) {
			key = keysA[i];
			if (!b.hasOwnProperty(key)) {
				return false;
			}
			if (!equals(a[key], b[key])) {
				return false;
			}
		}

		return true;
	}


	function arrayEquals(a, b){
		if (a.length !== b.length) {
			return false;
		}

		for (var i = 0, len = a.length; i < len; i++) {
			if (!equals(a[i], b[i])) {
				return false;
			}
		}

		return true;
	}


	var makeEquals = function(constructor) {
		var proto = constructor.prototype;

		proto.equals = function(other) {
			if (other === this) {
				return true;
			}

			return objectEquals(this, other);
		};
	};


	return makeEquals;

});
