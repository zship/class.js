define(function(require) {

	'use strict';


	var create = require('./base/create');


	var Class = create('Class', /** @lends Class.prototype */{

		__chains: {
			destroy: 'before'
		},


		/**
		 * @constructs
		 */
		constructor: function() {},


		destroy: function() {}

	});


	return Class;

});
