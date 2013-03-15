define(function(require){

	'use strict';


	var create = require('base/create');
	var Deferred = require('deferreds/Deferred');


	module('plugin/chain');


	asyncTest('Chaining and Deferreds', function() {
		var startCalled = [];
		var stopCalled = [];
		var startCompleted = false;
		var stopCompleted = false;

		var A = create({
			__chains: {
				start: 'after',
				stop: 'before'
			},

			constructor: function() {
				this.contextTestA = 'A';
			},

			start: function() {
				startCalled.push('A');
				strictEqual(this.contextTestA, 'A', 'A: chained method retains context');
				var deferred = new Deferred();
				window.setTimeout(function() {
					startCompleted = true;
					deferred.resolve();
				}, 0);
				return deferred;
			},

			stop: function() {
				stopCalled.push('A');
				strictEqual(stopCompleted, true, 'A: A.stop waited for B.stop to complete');
			}
		});

		var B = create(A, {
			constructor: function() {
				this._super();
				this.contextTestB = 'B';
			},

			start: function() {
				startCalled.push('B');
				strictEqual(this.contextTestB, 'B', 'B: chained method retains context');
				strictEqual(startCompleted, true, 'B: B.start waited for A.start to complete');
			},

			stop: function() {
				stopCalled.push('B');
				var deferred = new Deferred();
				window.setTimeout(function() {
					stopCompleted = true;
					deferred.resolve();
				}, 0);
				return deferred;
			}
		});

		var b = new B();
		b.start().then(function() {
			strictEqual(startCalled.join(' '), 'A B', 'A.start called before B.start');
			b.stop().then(function() {
				strictEqual(stopCalled.join(' '), 'B A', 'B.stop called before A.stop');
				start();
			});
		});
	});


	asyncTest('Chaining with missing link', function() {
		var startCalled = [];

		var A = create({
			__chains: {
				start: 'after'
			},

			start: function() {
				startCalled.push('A');
			}
		});

		var B = A.extend({});

		var C = B.extend({
			start: function() {
				startCalled.push('C');
			}
		});

		var c = new C();
		c.start().then(function() {
			strictEqual(startCalled.join(' '), 'A C', 'A.start called, then C.start');
			start();
		});
	});


});
