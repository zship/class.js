define(function(require){

	'use strict';


	var create = require('base/create');


	module('plugin/props');


	test('Generated Accessors', function() {
		var Class = create({
			constructor: function() {
				this._data = {
					a: 1,
					b: 2,
					c: 3
				};
			},

			a: { get: null, set: null },
			b: { get: null, set: null },
			c: { get: null }
		});

		var keys = Object.getOwnPropertyNames(Class.prototype);
		ok(keys.indexOf('a') !== -1, 'a is a property');
		ok(keys.indexOf('b') !== -1, 'b is a property');

		var obj = new Class();
		strictEqual(obj.a, 1, 'getter a');
		obj.a = 10;
		strictEqual(obj.a, 10, 'setter a');

		strictEqual(obj.b, 2, 'getter b');
		obj.b = 20;
		strictEqual(obj.b, 20, 'setter a');

		strictEqual(obj.c, 3, 'getter c');
		throws(function() {
			obj.c = 30;
		}, 'Attempting to set read-only property "c" throws an error');
	});


	test('Nested Accessors', function() {
		var called = false;
		var Class = create({
			constructor: function() {
				this._data = {
					a: {
						b: 'init'
					}
				};
			},

			'a.b': {
				set: function(val) {
					called = true;
					this._data.a.b = val;
				}
			}
		});


		var obj = new Class();
		strictEqual(obj.a.b, 'init', 'initial a.b');

		obj.a.b = 'foo';
		ok(called, 'a.b setter was called');
		called = false;
		strictEqual(obj.a.b, 'foo', 'change a.b, get a.b');
		strictEqual(obj._data.a.b, 'foo', 'change a.b, get a.b === _data.a.b');

		obj.a = {
			b: 'bar'
		};
		ok(called, 'a.b setter was called');
		called = false;
		strictEqual(obj.a.b, 'bar', 'changed a, get a.b');
		strictEqual(obj._data.a.b, 'bar', 'changed a, get a.b === _data.a.b');

		obj.a.b = 'baz';
		ok(called, 'a.b setter was called');
		called = false;
		strictEqual(obj.a.b, 'baz', 'changed a, set a.b');
		strictEqual(obj._data.a.b, 'baz', 'changed a, set a.b, a.b === _data.a.b');

		obj.a = {
			b: {
				c: 'foo'
			}
		};

		strictEqual(obj.a.b.c, 'foo', 'add a.b.c (more deeply-nested than original definition of a)');
		strictEqual(obj._data.a.b.c, 'foo', 'add a.b.c, a.b.c === _data.a.b.c');

		obj.a.b.c = 'bar';

		strictEqual(obj.a.b.c, 'bar', 'change a.b.c');
		strictEqual(obj._data.a.b.c, 'bar', 'change a.b.c, a.b.c === _data.a.b.c');

		obj.a.b = {
			c: 'baz'
		};

		strictEqual(obj.a.b.c, 'baz', 'change a.b, get a.b.c');
		strictEqual(obj._data.a.b.c, 'baz', 'change a.b, get a.b.c === _data.a.b.c');
	});

});
