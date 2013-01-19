define(function() {

	//return a new object that inherits from ctor.prototype but without
	//actually running ctor on the object.
	var forceNew = function(ctor) {
		//create object with correct prototype using a do-nothing constructor
		var xtor;
		if (ctor._meta && ctor._meta.name) {
			//override constructor name given in common debuggers
			xtor = eval('1&&function ' + ctor._meta.name + '(){}');
		}
		else {
			xtor = function() {};
		}
		xtor.prototype = ctor.prototype;
		var instance = new xtor();
		xtor.prototype = null;
		return instance;
	};


	return forceNew;

});
