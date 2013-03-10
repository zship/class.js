define(function(require){

	'use strict';

	var create = require('create');
	var Class = require('Class');
	var guessClassName = require('plugin/guessName');


	module('plugin/guessName');


	test('Guessing class names from source', function() {
		var A = create({});
		strictEqual(A._meta.name, 'A', 'var A = create... - guessed "A"');

		var B= create({});
		strictEqual(B._meta.name, 'B', 'var B= create... - guessed "B"');

		var C=create({});
		strictEqual(C._meta.name, 'C', 'var C=create... - guessed "C"');

		//throw one we won't detect into the mix
		var O = (function() {
			return create({});
		})();

		strictEqual(O._meta.name, undefined, 'var O=(function(){ return create... })() - not guessed');

		//throw an explicitly-defined one into the mix
		var P = create('P', {});
		strictEqual(P._meta.name, 'P', 'var P = create("P",... - explicitly defined, so not guessed');

		var D;
		D = create({});
		strictEqual(D._meta.name, 'D', 'var D; <line break> D = create... - guessed "D"');

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
