define(function(require){

	var Class = require('Class');


	module('Class');


	//string of linearized class heirarchy
	var lin = function(ctor) {
		return ctor._meta.bases.map(function(base) {
			return base._meta.name;
		}).join(' ');
	};


	test('Class.extend arguments', function() {
		var A = Class.extend({});
		var B = A.extend({});

		strictEqual(lin(B), 'A Class', 'A.extend creates a constructor inheriting from A');

		var C = B.extend({});

		strictEqual(lin(C), 'B A Class', 'B.extend creates a constructor inheriting from (B, A)');

		var Named = Class.extend('DebuggerName', {});

		strictEqual(Named._meta.name, 'DebuggerName', 'Class.extend accepts debugger name as first argument');

		var O = Class.extend({});
		var D = A.extend(O, {});

		strictEqual(lin(D), 'A O Class', 'Class.extend accepts multiple inheritance/"mixin" classes');

		Named = A.extend('DebuggerName2', O, {});

		ok(Named._meta.name === 'DebuggerName2' && lin(Named) === 'A O Class', 'Class.extend accepts both a debugger name and "mixin" classes');
	});


	test('constructor: new', function() {
		var A = Class.extend({});

		var a = new A();
		strictEqual(a.constructor, A, 'new A().constructor === A');

		throws(function() {
			a = A();
		}, 'A() without `new` throws an error');
	});

});
