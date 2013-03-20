define(function(require){

	'use strict';


	var Class = require('Class');


	module('plugin/guessName');


	test('Guessing class names from source', function() {
		var A = Class.extend({});
		strictEqual(A._meta.name, 'A', 'var A = Class.extend... - guessed "A"');

		var B= Class.extend({});
		strictEqual(B._meta.name, 'B', 'var B= Class.extend... - guessed "B"');

		var C=Class.extend({});
		strictEqual(C._meta.name, 'C', 'var C=Class.extend... - guessed "C"');

		//throw one we won't detect into the mix
		var O = (function() {
			return Class.extend({});
		})();

		strictEqual(O._meta.name, undefined, 'var O=(function(){ return Class.extend... })() - not guessed');

		//throw an explicitly-defined one into the mix
		var P = Class.extend('P', {});
		strictEqual(P._meta.name, 'P', 'var P = Class.extend("P",... - explicitly defined, so not guessed');

		var D;
		D = Class.extend({});
		strictEqual(D._meta.name, 'D', 'var D; <line break> D = Class.extend... - guessed "D"');

		var E = A.extend({});
		strictEqual(E._meta.name, 'E', 'var E = A.extend... - guessed "E"');

		var F = B.extend({});
		strictEqual(F._meta.name, 'F', 'var F = B.extend... - guessed "F"');

		var G= C.extend({});
		strictEqual(G._meta.name, 'G', 'var G= C.extend... - guessed "G"');

		var H=D.extend({});
		strictEqual(H._meta.name, 'H', 'var H=D.extend... - guessed "H"');
	});

});
