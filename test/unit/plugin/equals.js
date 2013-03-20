define(function(require){

	'use strict';


	var Class = require('Class');


	module('plugin/equals');


	test('equals', function() {
		var A = Class.extend({});

		var a1 = new A();
		a1.obj = {a: 1, b: 2};
		a1.arr = [1, 2, 3];

		var a2 = new A();
		a2.obj = {a: 1, b: 2};
		a2.arr = [1, 2, 3];

		ok(a1.equals(a2), 'Basic recursive value equality');
	});

});
