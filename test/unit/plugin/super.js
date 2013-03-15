define(function(require){

	'use strict';


	var create = require('base/create');


	module('plugin/super');


	test('_super', function() {
		//in AOP "before" order
		var called = [];
		var A = create({
			start: function() {
				called.push('A');
			}
		});

		var B = create(A, {
			start: function() {
				this._super();
				called.push('B');
			}
		});

		var C = create(B, {
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
		A = create({
			start: function() {
				called.push('A');
			}
		});

		B = create(A, {
			start: function() {
				called.push('B');
				this._super();
			}
		});

		C = create(B, {
			start: function() {
				called.push('C');
				this._super();
			}
		});

		c = new C();
		c.start();

		strictEqual(called.join(' '), 'C B A', '_start called after: methods called in correct order');




		called = [];
		A = create({
			start: function() {
				called.push('A');
			}
		});

		B = create(A, {
			start: function() {
				called.push('B');
				this._super();
			}
		});

		C = create(B, {
			start: function() {
				//called.push('C');
				this._super();
			}
		});

		c = new C();
		var start, end;
		start = new Date().getTime();
		for (var i = 0; i < 1000000; i++) {
			c.start();
		}
		end = new Date().getTime();
		console.log('super 1:' + (end - start));



		//missing a link in the chain
		called = [];
		A = create({
			start: function() {
				called.push('A');
			}
		});

		B = create(A, {});

		C = create(B, {
			start: function() {
				called.push('C');
				this._super();
			}
		});

		c = new C();
		c.start();

		strictEqual(called.join(' '), 'C A', 'superclass missing a method: skip to next superclass in the chain');


		//returning values from _super()
		A = create({
			start: function() {
				return 'A1';
			}
		});

		B = create(A, {
			start: function() {
				var ret = this._super();
				return ret + ' B2';
			}
		});

		C = create(B, {
			start: function() {
				var ret = this._super();
				return ret + ' C3';
			}
		});

		c = new C();
		var ret = c.start();

		strictEqual(ret, 'A1 B2 C3', 'returning values from _super');


		//passing args to _super()
		A = create({
			start: function(arg) {
				return 'A' + arg;
			}
		});

		B = create(A, {
			start: function(arg) {
				return this._super('B' + arg);
			}
		});

		C = create(B, {
			start: function() {
				return this._super('C');
			}
		});

		c = new C();
		ret = c.start();

		strictEqual(ret, 'ABC', 'passing arguments to _super');
	});

});
