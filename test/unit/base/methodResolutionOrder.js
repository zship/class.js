define(function(require){

	'use strict';


	var Class = require('Class');


	module('methodResolutionOrder');


	//string of linearized class heirarchy
	var lin = function(ctor) {
		return ctor._meta.bases.map(function(base) {
			return base._meta.name;
		}).join(' ');
	};


	test('Inheritance', function() {
		var A = Class.extend({});
		var B = A.extend({});
		var C = B.extend({});

		strictEqual(lin(C), 'B A Class', 'single inheritance');

		A = Class.extend({});
		B = Class.extend({});
		C = B.extend(A, {});

		strictEqual(lin(C), 'B A Class', 'multiple inheritance');

		A = Class.extend({});
		B = Class.extend({});
		C = A.extend(B, {});

		strictEqual(lin(C), 'A B Class', 'multiple inheritance 2');

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
		var O = Class.extend({});
		var F = O.extend({});
		var E = O.extend({});
		var D = O.extend({});
		C = D.extend(F, {});
		B = D.extend(E, {});
		A = B.extend(C, {});

		strictEqual(lin(B), 'D E O Class', 'complex multiple inheritance 1');
		strictEqual(lin(C), 'D F O Class', 'complex multiple inheritance 2');
		strictEqual(lin(A), 'B C D E F O Class', 'complex multiple inheritance 3');
	});

});
