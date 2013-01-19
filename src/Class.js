define(function(require) {

	var create = require('./create');


	var Class = create(/** @lends Class.prototype */{
		
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


	/**
	 * @name Class.extend
	 * @description Convenience shortcut for {joss/oop/Classes.create}
	 * @method
	 * @param {String} [className]
	 * @param {...joss/oop/Class} [superclasses]
	 * @param {Object} members
	 * @return {Constructor}
	 */

});
