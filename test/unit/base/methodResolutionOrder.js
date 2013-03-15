define(function(require){

	'use strict';


	var create = require('base/create');


	module('methodResolutionOrder');


	//string of linearized class heirarchy
	var lin = function(ctor) {
		return ctor._meta.bases.map(function(base) {
			return base._meta.name;
		}).join(' ');
	};


	test('Inheritance', function() {
		var A = create({});
		var B = create(A, {});
		var C = create(B, {});

		strictEqual(lin(C), 'B A', 'single inheritance');

		A = create({});
		B = create({});
		C = create(B, A, {});

		strictEqual(lin(C), 'B A', 'multiple inheritance');

		A = create({});
		B = create({});
		C = create(A, B, {});

		strictEqual(lin(C), 'A B', 'multiple inheritance 2');

		//more complex: from http://www.python.org/download/releases/2.3/mro/
		/*
                                  ---
         Level 3                 | O |                  (more general)
                               /  ---  \
                              /    |    \                      |
                             /     |     \                     |
                            /      |      \                    |
                           ---    ---    ---                   |
         Level 2        3 | D | 4| E |  | F | 5                |
                           ---    ---    ---                   |
                            \  \ _ /       |                   |
                             \    / \ _    |                   |
                              \  /      \  |                   |
                               ---      ---                    |
         Level 1            1 | B |    | C | 2                 |
                               ---      ---                    |
                                 \      /                      |
                                  \    /                      \ /
                                    ---
         Level 0                 0 | A |                (more specialized)
                                    ---
		*/
		var O = create({});
		var F = create(O, {});
		var E = create(O, {});
		var D = create(O, {});
		C = create(D, F, {});
		B = create(D, E, {});
		A = create(B, C, {});

		strictEqual(lin(B), 'D E O', 'complex multiple inheritance 1');
		strictEqual(lin(C), 'D F O', 'complex multiple inheritance 2');
		strictEqual(lin(A), 'B C D E F O', 'complex multiple inheritance 3');
	});

});
