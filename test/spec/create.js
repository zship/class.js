define(function(require){

	var create = require('create');


	module('create');


	//string of linearized class heirarchy
	var lin = function(ctor) {
		return ctor._meta.bases.map(function(base) {
			return base._meta.name;
		}).join(' ');
	};


	test('new operator', function() {
		var A = create({});

		var a = new A();
		strictEqual(a.constructor, A, 'new A().constructor === A');

		a = A();
		strictEqual(a.constructor, A, 'A().constructor === A');
	});


	test('extend()', function() {
		var A = create({});
		var B = A.extend({});

		strictEqual(lin(B), 'A', 'A.extend creates a constructor inheriting from A');

		var C = B.extend({});

		strictEqual(lin(C), 'B A', 'B.extend creates a constructor inheriting from (B, A)');
	});

});
