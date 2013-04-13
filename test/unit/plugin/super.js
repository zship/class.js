define(function(require){

	'use strict';


	var Class = require('Class');


	module('plugin/super');


	test('_super', function() {
		//in AOP "before" order
		var called = [];
		var A = Class.extend({
			start: function() {
				called.push('A');
			}
		});

		var B = A.extend({
			start: function() {
				this._super();
				called.push('B');
			}
		});

		var C = B.extend({
			start: function() {
				this._super();
				called.push('C');
			}
		});

		var c = new C();
		c.start();

		strictEqual(called.join(' '), 'A B C', '_start called before: methods called in correct order');


		//in AOP "after" order
		called = [];
		A = Class.extend({
			start: function() {
				called.push('A');
			}
		});

		B = A.extend({
			start: function() {
				called.push('B');
				this._super();
			}
		});

		C = B.extend({
			start: function() {
				called.push('C');
				this._super();
			}
		});

		c = new C();
		c.start();

		strictEqual(called.join(' '), 'C B A', '_start called after: methods called in correct order');


		//missing a link in the chain
		called = [];
		A = Class.extend({
			start: function() {
				called.push('A');
			}
		});

		B = A.extend({});

		C = B.extend({
			start: function() {
				called.push('C');
				this._super();
			}
		});

		c = new C();
		c.start();

		strictEqual(called.join(' '), 'C A', 'superclass missing a method: skip to next superclass in the chain');


		//returning values from _super()
		A = Class.extend({
			start: function() {
				return 'A1';
			}
		});

		B = A.extend({
			start: function() {
				var ret = this._super();
				return ret + ' B2';
			}
		});

		C = B.extend({
			start: function() {
				var ret = this._super();
				return ret + ' C3';
			}
		});

		c = new C();
		var ret = c.start();

		strictEqual(ret, 'A1 B2 C3', 'returning values from _super');


		//passing args to _super()
		A = Class.extend({
			start: function(arg) {
				return 'A' + arg;
			}
		});

		B = A.extend({
			start: function(arg) {
				return this._super('B' + arg);
			}
		});

		C = B.extend({
			start: function() {
				return this._super('C');
			}
		});

		c = new C();
		ret = c.start();

		strictEqual(ret, 'ABC', 'passing arguments to _super');


		//calling super outside of a method
		throws(function() {
			c._super();
		}, 'calling super outside of a class method throws an error');
	});

});
