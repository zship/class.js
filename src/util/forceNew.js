/*jshint evil:true, strict:false*/
define(function() {

	//return a new object that inherits from ctor.prototype but without
	//actually running ctor on the object.
	var forceNew = function(ctor) {
		//create object with correct prototype using a do-nothing constructor
		var Xtor;
		if (ctor._meta && ctor._meta.name) {
			//override constructor name given in common debuggers
			Xtor = eval('1&&function ' + ctor._meta.name + '(){}');
		}
		else {
			Xtor = function() {};
		}
		Xtor.prototype = ctor.prototype;
		var instance = new Xtor();
		Xtor.prototype = null;
		return instance;
	};


	return forceNew;

});
