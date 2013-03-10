module.exports = (function() {
	
/**
 * almond 0.2.0 Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        aps = [].slice;

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (waiting.hasOwnProperty(name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!defined.hasOwnProperty(name) && !defining.hasOwnProperty(name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (defined.hasOwnProperty(depName) ||
                           waiting.hasOwnProperty(depName) ||
                           defining.hasOwnProperty(depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 15);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        return req;
    };

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        waiting[name] = [name, deps, callback];
    };

    define.amd = {
        jQuery: true
    };
}());

define("../node_modules/grunt-amd-dist/tasks/lib/almond", function(){});

define('mout/lang/kindOf',[],function () {

    var _rKind = /^\[object (.*)\]$/,
        _toString = Object.prototype.toString,
        UNDEF;

    /**
     * Gets the "kind" of value. (e.g. "String", "Number", etc)
     */
    function kindOf(val) {
        if (val === null) {
            return 'Null';
        } else if (val === UNDEF) {
            return 'Undefined';
        } else {
            return _rKind.exec( _toString.call(val) )[1];
        }
    }
    return kindOf;
});

define('mout/lang/toArray',['./kindOf'], function (kindOf) {

    var _win = this;

    /**
     * Convert array-like object into array
     */
    function toArray(val){
        var ret = [],
            kind = kindOf(val),
            n;

        if (val != null) {
            if ( val.length == null || kind === 'String' || kind === 'Function' || kind === 'RegExp' || val === _win ) {
                //string, regexp, function have .length but user probably just want
                //to wrap value into an array..
                ret[ret.length] = val;
            } else {
                //window returns true on isObject in IE7 and may have length
                //property. `typeof NodeList` returns `function` on Safari so
                //we can't use it (#58)
                n = val.length;
                while (n--) {
                    ret[n] = val[n];
                }
            }
        }
        return ret;
    }
    return toArray;
});

define('mout/lang/isKind',['./kindOf'], function (kindOf) {
    /**
     * Check if value is from a specific "kind".
     */
    function isKind(val, kind){
        return kindOf(val) === kind;
    }
    return isKind;
});

define('mout/lang/isString',['./isKind'], function (isKind) {
    /**
     */
    function isString(val) {
        return isKind(val, 'String');
    }
    return isString;
});

define('mout/object/hasOwn',[],function () {

    /**
     * Safer Object.hasOwnProperty
     */
     function hasOwn(obj, prop){
         return Object.prototype.hasOwnProperty.call(obj, prop);
     }

     return hasOwn;

});

define('mout/object/forIn',[],function () {

    var _hasDontEnumBug,
        _dontEnums;

    function checkDontEnum(){
        _dontEnums = [
                'toString',
                'toLocaleString',
                'valueOf',
                'hasOwnProperty',
                'isPrototypeOf',
                'propertyIsEnumerable',
                'constructor'
            ];

        _hasDontEnumBug = true;

        for (var key in {'toString': null}) {
            _hasDontEnumBug = false;
        }
    }

    /**
     * Similar to Array/forEach but works over object properties and fixes Don't
     * Enum bug on IE.
     * based on: http://whattheheadsaid.com/2010/10/a-safer-object-keys-compatibility-implementation
     */
    function forIn(obj, fn, thisObj){
        var key, i = 0;
        // no need to check if argument is a real object that way we can use
        // it for arrays, functions, date, etc.

        //post-pone check till needed
        if (_hasDontEnumBug == null) checkDontEnum();

        for (key in obj) {
            if (exec(fn, obj, key, thisObj) === false) {
                break;
            }
        }

        if (_hasDontEnumBug) {
            while (key = _dontEnums[i++]) {
                // since we aren't using hasOwn check we need to make sure the
                // property was overwritten
                if (obj[key] !== Object.prototype[key]) {
                    if (exec(fn, obj, key, thisObj) === false) {
                        break;
                    }
                }
            }
        }
    }

    function exec(fn, obj, key, thisObj){
        return fn.call(thisObj, obj[key], key, obj);
    }

    return forIn;

});

define('mout/object/forOwn',['./hasOwn', './forIn'], function (hasOwn, forIn) {

    /**
     * Similar to Array/forEach but works over object properties and fixes Don't
     * Enum bug on IE.
     * based on: http://whattheheadsaid.com/2010/10/a-safer-object-keys-compatibility-implementation
     */
    function forOwn(obj, fn, thisObj){
        forIn(obj, function(val, key){
            if (hasOwn(obj, key)) {
                return fn.call(thisObj, obj[key], key, obj);
            }
        });
    }

    return forOwn;

});

define('methodResolutionOrder',[],function() {

	

	var _merge = function(seqs) {
		var result = [];

		while (true) {

			var nonemptyseqs = seqs.filter(function(seq) {
				return seq && seq.length;
			});

			if (!nonemptyseqs.length) {
				return result;
			}

			var candidate;

			//find merge candidates among seq heads
			nonemptyseqs.every(function(seq) {
				candidate = seq[0];

				//if the candidate is in the tail of any other seqs
				var notHead = nonemptyseqs.filter(function(seq) {
					var tail = seq.slice(1);
					return tail.indexOf(candidate) !== -1;
				}).length > 0;

				//reject candidate
				if (notHead) {
					candidate = null;
					return true; //continue
				}

				return false; //break
			});

			if (!candidate) {
				throw new Error('Inconsistent heirarchy');
			}

			result.push(candidate);

			//remove candidate
			seqs = nonemptyseqs.map(function(seq) {
				if (seq[0] === candidate) {
					return seq.slice(1);
				}
				return seq;
			});

		}
	};


	//C3 Method Resolution Order (see http://www.python.org/download/releases/2.3/mro/)
	var methodResolutionOrder = function(constructor){
		var bases = constructor._meta.bases.slice(0);

		var seqs =
			[[constructor]]
			.concat(bases.map(function(base) {
				return methodResolutionOrder(base);
			}))
			.concat([bases.slice(0)]);

		//the linearization of C is the sum of C plus the merge of the
		//linearizations of the parents and the list of the parents.
		return _merge(seqs);
	};


	return methodResolutionOrder;

});

define('makeConstructor',['require','mout/object/forOwn'],function(require) {

	

	var forOwn = require('mout/object/forOwn');


	var makeConstructor = function(fn, proto, meta) {
		//proto.constructor is about to be overwritten. if plugins modified it,
		//save that modification in meta.ctor.
		meta.ctor = proto.constructor;

		var constructor = fn || function() {};
		constructor._meta = meta;
		constructor.prototype = proto;
		proto.constructor = constructor;

		forOwn(meta.statics, function(val, key) {
			constructor[key] = val;
		});

		return constructor;
	};


	return makeConstructor;

});

define('basicCreate',['require','mout/lang/toArray','mout/lang/isString','mout/object/forOwn','./methodResolutionOrder','./makeConstructor'],function(require) {

	

	var toArray = require('mout/lang/toArray');
	var isString = require('mout/lang/isString');
	var forOwn = require('mout/object/forOwn');
	var methodResolutionOrder = require('./methodResolutionOrder');
	var makeConstructor = require('./makeConstructor');


	/**
	 * @param {String} [className]
	 * @param {...Constructor} [superclasses]
	 * @param {Object} members
	 * @return {Constructor}
	 */
	var base = function() {

		var args = toArray(arguments);
		var className;
		var superclasses = [];
		var members;

		if (isString(args[0])) {
			className = args[0];
			args.shift();
		}

		if (args[0]._meta) {
			superclasses = args.slice(0, -1);
			args = args.slice(-1);
		}

		members = args[0];


		/*
		 * ----------------------------------------------------------------------
		 * Step 1:
		 * Determine inheritance heirarchy and store linearized version in
		 * `bases`, in order from subclass to superclass.
		 * ----------------------------------------------------------------------
		 */
		var bases = [];

		if (superclasses.length === 1) {
			var superclass = superclasses[0];
			bases = [superclass].concat(superclass._meta.bases);
		}
		else if (superclasses.length > 1) {
			//methodResolutionOrder works on constructors. pass an object
			//mimicking a real constructor
			bases = methodResolutionOrder({
				_meta: {
					bases: superclasses
				}
			});
			bases.shift(); //first result is the constructor itself
		}


		/*
		 * ----------------------------------------------------------------------
		 * Step 2:
		 * Build prototype by mixing-in members in `bases`, and then mixing-in
		 * passed `members`
		 * ----------------------------------------------------------------------
		 */
		var proto = {};

		bases
			.slice(0)
			.reverse()
			.map(function(base) {
				return base._meta.members;
			})
			.concat([members])
			.forEach(function(props) {
				forOwn(props, function(prop, key) {
					proto[key] = prop;
				});
			});


		/*
		 * ----------------------------------------------------------------------
		 * Step 3:
		 * Gather introspection info in the `meta` variable. This will be added
		 * to the final constructor.
		 * ----------------------------------------------------------------------
		 */
		var meta = {};
		meta.name = className;
		meta.bases = bases;
		meta.members = members;

		//any "static" methods defined directly on a base constructor
		meta.statics = {};
		meta.bases.slice(0).reverse().forEach(function(base) {
			forOwn(base, function(val, key) {
				if (key === '_meta') {
					return;
				}
				meta.statics[key] = val;
			});
		});

		//the user-supplied constructor
		meta.ctor = function() {};
		if (members.hasOwnProperty('constructor')) {
			meta.ctor = members.constructor;
		}
		//if one wasn't provided, use the nearest superclass' ctor
		else {
			meta.bases.every(function(base) {
				if (base._meta.ctor) {
					meta.ctor = base._meta.ctor;
					return false;
				}
				return true;
			});
		}


		/*
		 * ----------------------------------------------------------------------
		 * Step 4:
		 * Build the constructor function
		 * ----------------------------------------------------------------------
		 */
		return makeConstructor(meta.ctor, proto, meta);

	};


	return base;

});

/*jshint evil:true, strict:false*/
define('util/forceNew',[],function() {

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

define('mout/collection/make_',[],function(){

    /**
     * internal method used to create other collection modules.
     */
    function makeCollectionMethod(arrMethod, objMethod, defaultReturn) {
        return function(){
            var args = Array.prototype.slice.call(arguments);
            if (args[0] == null) {
                return defaultReturn;
            }
            // array-like is treated as array
            return (typeof args[0].length === 'number')? arrMethod.apply(null, args) : objMethod.apply(null, args);
        };
    }

    return makeCollectionMethod;

});

define('mout/array/forEach',[],function () {

    /**
     * Array forEach
     */
    function forEach(arr, callback, thisObj) {
        if (arr == null) {
            return;
        }
        var i = -1,
            n = arr.length;
        while (++i < n) {
            // we iterate over sparse items since there is no way to make it
            // work properly on IE 7-8. see #64
            if ( callback.call(thisObj, arr[i], i, arr) === false ) {
                break;
            }
        }
    }

    return forEach;

});

define('mout/collection/forEach',['./make_', '../array/forEach', '../object/forOwn'], function (make, arrForEach, objForEach) {

    /**
     */
    return make(arrForEach, objForEach);

});

define('mout/lang/isObject',['./isKind'], function (isKind) {
    /**
     */
    function isObject(val) {
        return isKind(val, 'Object');
    }
    return isObject;
});

define('util/isElement',[],function() {

	

	/**
	 * Determine if an object is a jQuery element or a DOM element.
	 * @param {Any} obj
	 * @return {Boolean}
	 */
	var isElement = function(obj) {
		if (!obj || typeof obj !== 'object') {
			return false;
		}

		var el = obj;
		if (obj[0]) { //possible jQuery object
			el = obj[0];
		}
		return typeof el === 'object' && typeof el.nodeType === 'number' && typeof el.nodeName==='string';
	};


	return isElement;

});

define('util/defaults',['require','mout/collection/forEach','mout/lang/isObject','./isElement'],function(require) {

	

	var forEach = require('mout/collection/forEach');
	var isObject = require('mout/lang/isObject');
	var isElement = require('./isElement');


	/**
	 * Combine properties from `sources` into `target`, recursively mixing
	 * child objects and skipping null/undefined values
	 * @param {Object} target
	 * @param {...Object} sources
	 * @return {Object}
	 */
	var defaults = function(target) {
		var i = 0;

		while(++i < arguments.length){
			var obj = arguments[i];
			if (obj !== null && obj !== undefined) {
				forEach(obj, function(val, key) {
					if (!target.hasOwnProperty(key)) {
						target[key] = {};
					}

					//deep merge only objects
					if (val && isObject(val) && !isElement(val)) {
						defaults(target[key], val);
					} else {
						target[key] = val;
					}
				});
			}
		}

		return target;
	};


	return defaults;

});

define('mout/object/filter',['./forOwn'], function(forOwn) {

    /**
     * Creates a new object with all the properties where the callback returns
     * true.
     */
    function filterValues(obj, callback, thisObj) {
        var output = {};
        forOwn(obj, function(value, key, obj) {
            if (callback.call(thisObj, value, key, obj)) {
                output[key] = value;
            }
        });

        return output;
    }
    return filterValues;
});

define('plugin/apply',['require','mout/object/forOwn','mout/object/filter'],function(require) {

	

	var forOwn = require('mout/object/forOwn');
	var filter = require('mout/object/filter');


	var makeApply = function(constructor) {
		var proto = constructor.prototype;

		proto._apply = function(opts) {
			var descriptors = this.constructor._meta.descriptors;

			opts = filter(opts, function(val) {
				return val !== undefined && val !== null;
			});

			//set _data before calling setters, in case setter refers to other
			//properties in _data
			forOwn(opts, function(val, key) {
				if (descriptors[key]) {
					this._data[key] = opts[key];
				}
			}.bind(this));

			forOwn(opts, function(val, key) {
				if (descriptors[key] && descriptors[key].set) {
					descriptors[key].set.call(this, val);
				}
			}.bind(this));
		};
	};


	return makeApply;

});

define('mout/lang/isPlainObject',[],function () {

    /**
     * Checks if the value is created by the `Object` constructor.
     */
    function isPlainObject(value) {
        return (!!value
            && typeof value === 'object'
            && value.constructor === Object);
    }

    return isPlainObject;

});

define('mout/object/mixIn',['./forOwn'], function(forOwn){

    /**
    * Combine properties from all the objects into first one.
    * - This method affects target object in place, if you want to create a new Object pass an empty object as first param.
    * @param {object} target    Target Object
    * @param {...object} objects    Objects to be combined (0...n objects).
    * @return {object} Target Object.
    */
    function mixIn(target, objects){
        var i = 0,
            n = arguments.length,
            obj;
        while(++i < n){
            obj = arguments[i];
            if (obj != null) {
                forOwn(obj, copyProp, target);
            }
        }
        return target;
    }

    function copyProp(val, key){
        this[key] = val;
    }

    return mixIn;
});

define('mout/lang/clone',['./kindOf', './isPlainObject', '../object/mixIn'], function (kindOf, isPlainObject, mixIn) {

    /**
     * Clone native types.
     */
    function clone(val){
        switch (kindOf(val)) {
            case 'Object':
                return cloneObject(val);
            case 'Array':
                return cloneArray(val);
            case 'RegExp':
                return cloneRegExp(val);
            case 'Date':
                return cloneDate(val);
            default:
                return val;
        }
    }

    function cloneObject(source) {
        if (isPlainObject(source)) {
            return mixIn({}, source);
        } else {
            return source;
        }
    }

    function cloneRegExp(r) {
        var flags = '';
        flags += r.multiline ? 'm' : '';
        flags += r.global ? 'g' : '';
        flags += r.ignorecase ? 'i' : '';
        return new RegExp(r.source, flags);
    }

    function cloneDate(date) {
        return new Date(+date);
    }

    function cloneArray(arr) {
        return arr.slice();
    }

    return clone;

});

define('mout/lang/deepClone',['./clone', '../object/forOwn', './kindOf', './isPlainObject'], function (clone, forOwn, kindOf, isPlainObject) {

    /**
     * Recursively clone native types.
     */
    function deepClone(val, instanceClone) {
        switch ( kindOf(val) ) {
            case 'Object':
                return cloneObject(val, instanceClone);
            case 'Array':
                return cloneArray(val, instanceClone);
            default:
                return clone(val);
        }
    }

    function cloneObject(source, instanceClone) {
        if (isPlainObject(source)) {
            var out = {};
            forOwn(source, function(val, key) {
                this[key] = deepClone(val, instanceClone);
            }, out);
            return out;
        } else if (instanceClone) {
            return instanceClone(source);
        } else {
            return source;
        }
    }

    function cloneArray(arr, instanceClone) {
        var out = [],
            i = -1,
            n = arr.length,
            val;
        while (++i < n) {
            out[i] = deepClone(arr[i], instanceClone);
        }
        return out;
    }

    return deepClone;

});


define('mout/object/merge',['./hasOwn', '../lang/deepClone', '../lang/isObject'], function (hasOwn, deepClone, isObject) {

    /**
     * Deep merge objects.
     */
    function merge() {
        var i = 1,
            key, val, obj, target;

        // make sure we don't modify source element and it's properties
        // objects are passed by reference
        target = deepClone( arguments[0] );

        while (obj = arguments[i++]) {
            for (key in obj) {
                if ( ! hasOwn(obj, key) ) {
                    continue;
                }

                val = obj[key];

                if ( isObject(val) && isObject(target[key]) ){
                    // inception, deep merge objects
                    target[key] = merge(target[key], val);
                } else {
                    // make sure arrays, regexp, date, objects are cloned
                    target[key] = deepClone(val);
                }

            }
        }

        return target;
    }

    return merge;

});

define('deferreds/forceNew',[],function() {

	var forceNew = function(ctor, args, displayName) {
		//create object with correct prototype using a do-nothing constructor
		var xtor;
		//override constructor name given in common debuggers
		if (displayName) {
			xtor = eval('1&&function ' + displayName + '(){}');
		}
		else {
			xtor = function() {};
		}
		xtor.prototype = ctor.prototype;

		var instance = new xtor();
		xtor.prototype = null;

		ctor.apply(instance, args);
		return instance;
	};


	return forceNew;

});

define('mout/lang/isArray',['./isKind'], function (isKind) {
    /**
     */
    var isArray = Array.isArray || function (val) {
        return isKind(val, 'Array');
    };
    return isArray;
});

define('mout/function/bind',[],function(){

    function slice(arr, offset){
        return Array.prototype.slice.call(arr, offset || 0);
    }

    /**
     * Return a function that will execute in the given context, optionally adding any additional supplied parameters to the beginning of the arguments collection.
     * @param {Function} fn  Function.
     * @param {object} context   Execution context.
     * @param {rest} args    Arguments (0...n arguments).
     * @return {Function} Wrapped Function.
     */
    function bind(fn, context, args){
        var argsArr = slice(arguments, 2); //curried args
        return function(){
            return fn.apply(context, argsArr.concat(slice(arguments)));
        };
    }

    return bind;
});


define('deferreds/isDeferred',[],function() {

	var isDeferred = function(obj) {
		return obj && obj.promise;
	};

	return isDeferred;

});

define('deferreds/isPromise',[],function() {

	var isPromise = function(obj) {
		return obj && typeof obj.then === 'function';
	};


	return isPromise;

});

define('deferreds/Promise',['require','mout/object/mixIn'],function(require) {

	var mixin = require('mout/object/mixIn');


	/**
	 * @class
	 * @param {Deferred} deferred
	 */
	var Promise = function(deferred) {
		this._deferred = deferred;
	};


	mixin(Promise.prototype, /** @lends Promise.prototype */ {

		/**
		 * @return {Deferred.State}
		 */
		state: function() {
			return this._deferred._state;
		},

		/**
		 * @param {Function} doneCallback
		 * @param {Function} [failCallback]
		 * @param {Function} [progressCallback]
		 * @return this
		 */
		then: function() {
			this._deferred.then.apply(this._deferred, arguments);
			return this;
		},


		/**
		 * @param {Function} callback
		 * @return this
		 */
		done: function() {
			this._deferred.done.apply(this._deferred, arguments);
			return this;
		},


		/**
		 * @param {Function} callback
		 * @return this
		 */
		fail: function() {
			this._deferred.fail.apply(this._deferred, arguments);
			return this;
		},


		/**
		 * @param {Function} callback
		 * @return this
		 */
		always: function() {
			this._deferred.always.apply(this._deferred, arguments);
			return this;
		},


		/**
		 * @param {Function} callback
		 * @return this
		 */
		progress: function() {
			this._deferred.progress.apply(this._deferred, arguments);
			return this;
		},


		/**
		 * @param {Function} callback
		 * @return {Promise}
		 */
		pipe: function() {
			return this._deferred.pipe.apply(this._deferred, arguments);
		}

	});


	return Promise;

});

define('deferreds/Deferred',['require','./forceNew','mout/lang/isArray','mout/lang/toArray','mout/function/bind','mout/object/mixIn','./isDeferred','./isPromise','./Promise'],function(require) {

	var forceNew = require('./forceNew');
	var isArray = require('mout/lang/isArray');
	var toArray = require('mout/lang/toArray');
	var bind = require('mout/function/bind');
	var mixin = require('mout/object/mixIn');
	var isDeferred = require('./isDeferred');
	var isPromise = require('./isPromise');
	var Promise = require('./Promise');


	//apply each callback in `callbacks` with `args`
	var _execute = function(callbacks, args) {
		if (!callbacks) {
			return;
		}

		if (!isArray(callbacks)) {
			callbacks = [callbacks];
		}

		for (var i = 0; i < callbacks.length; i++) {
			callbacks[i].apply(null, args);
		}
	};


	/**
	 * @class
	 */
	var Deferred = function() {
		if (!(this instanceof Deferred)) {
			return forceNew(Deferred, arguments, 'Deferred');
		}

		this._state = Deferred.State.PENDING;
		this._callbacks = {
			done: [],
			fail: [],
			progress: []
		};
		this._closingArguments = [];
		this._promise = new Promise(this);
	};


	mixin(Deferred.prototype, /** @lends Deferred.prototype */ {

		/**
		 * @return {Promise}
		 */
		promise: function() {
			return this._promise;
		},


		/**
		 * @return {Deferred.State}
		 */
		state: function() {
			return this._state;
		},


		/**
		 * @param {...Any} args
		 * @return this
		 */
		resolve: function() {
			if (this._state !== Deferred.State.PENDING) { //already resolved/rejected
				return this;
			}

			this._state = Deferred.State.RESOLVED;
			_execute(this._callbacks.done, arguments);
			this._closingArguments = arguments;
			return this;
		},


		/**
		 * @param {...Any} args
		 * @return this
		 */
		reject: function() {
			if (this._state !== Deferred.State.PENDING) { //already resolved/rejected
				return this;
			}

			this._state = Deferred.State.REJECTED;
			_execute(this._callbacks.fail, arguments);
			this._closingArguments = arguments;
			return this;
		},


		/**
		 * @return this
		 */
		notify: function() {
			if (this._state !== Deferred.State.PENDING) { //already resolved/rejected
				return this;
			}

			_execute(this._callbacks.progress, arguments);
			return this;
		},


		/**
		 * @param {Function} doneCallback
		 * @param {Function} [failCallback]
		 * @param {Function} [progressCallback]
		 * @return this
		 */
		then: function(doneCallback, failCallback, progressCallback) {
			if (this._state === Deferred.State.RESOLVED) {
				_execute(doneCallback, this._closingArguments);
				return this;
			}

			if (this._state === Deferred.State.REJECTED) {
				_execute(failCallback, this._closingArguments);
				return this;
			}

			if (doneCallback) {
				this._callbacks.done.push(doneCallback);
			}

			if (failCallback) {
				this._callbacks.fail.push(failCallback);
			}

			if (progressCallback) {
				this._callbacks.progress.push(progressCallback);
			}

			return this;
		},


		/**
		 * @param {Function} callback
		 * @return this
		 */
		done: function(callback) {
			return this.then(callback);
		},


		/**
		 * @param {Function} callback
		 * @return this
		 */
		fail: function(callback) {
			return this.then(undefined, callback);
		},


		/**
		 * @param {Function} callback
		 * @return this
		 */
		always: function(callback) {
			return this.then(callback, callback);
		},


		/**
		 * @param {Function} callback
		 * @return this
		 */
		progress: function(callback) {
			return this.then(undefined, undefined, callback);
		},


		/**
		 * @param {Function} callback
		 * @return {Promise}
		 */
		pipe: function(callback) {
			var deferred = new Deferred();

			this
				.fail(bind(deferred.reject, deferred))
				.done(function() {
					var args = toArray(arguments);

					var callbackDeferred = (function() {
						var result = callback.apply(callback, args);
						if (isDeferred(result) || isPromise(result)) {
							return result;
						}
						return new Deferred().resolve(result).promise();
					})();

					callbackDeferred
						.fail(bind(deferred.reject, deferred))
						.done(bind(deferred.resolve, deferred))
						.progress(bind(deferred.notify, deferred));
				})
				.progress(bind(deferred.notify, deferred));

			return deferred.promise();
		}

	});


	/**
	 * @enum {String}
	 * @const
	 */
	Deferred.State = {
		PENDING: "pending",
		RESOLVED: "resolved",
		REJECTED: "rejected"
	};


	return Deferred;

});

define('mout/function/partial',[],function () {

    function slice(arr, offset){
        return Array.prototype.slice.call(arr, offset || 0);
    }

    /**
     * Creates a partially applied function.
     */
    function partial(fn, var_args){
        var argsArr = slice(arguments, 1); //curried args
        return function(){
            return fn.apply(this, argsArr.concat(slice(arguments)));
        };
    }

    return partial;

});

define('mout/lang/isFunction',['./isKind'], function (isKind) {
    /**
     */
    function isFunction(val) {
        return isKind(val, 'Function');
    }
    return isFunction;
});

define('deferreds/anyToDeferred',['require','./Deferred','mout/lang/isFunction','./isDeferred','./isPromise'],function(require) {

	var Deferred = require('./Deferred');
	var isFunction = require('mout/lang/isFunction');
	var isDeferred = require('./isDeferred');
	var isPromise = require('./isPromise');


	var anyToDeferred = function(obj) {
		//any arguments after obj will be passed to obj(), if obj is a function
		var args = Array.prototype.slice.call(arguments, 1);
		if (isDeferred(obj) || isPromise(obj)) {
			return obj;
		}
		else if (isFunction(obj)) {
			var result = obj.apply(obj, args);
			if (isDeferred(result) || isPromise(result)) {
				return result;
			}
			return Deferred().resolve(result).promise();
		}
		else {
			return Deferred().resolve(obj).promise();
		}
	};


	return anyToDeferred;

});

define('mout/object/keys',['./forOwn'], function (forOwn) {

    /**
     * Get object keys
     */
     var keys = Object.keys || function (obj) {
            var keys = [];
            forOwn(obj, function(val, key){
                keys.push(key);
            });
            return keys;
        };

    return keys;

});

define('mout/object/size',['./forOwn'], function (forOwn) {

    /**
     * Get object size
     */
    function size(obj) {
        var count = 0;
        forOwn(obj, function(){
            count++;
        });
        return count;
    }

    return size;

});

define('mout/collection/size',['../lang/isArray', '../object/size'], function (isArray, objSize) {

    /**
     * Get collection size
     */
    function size(list) {
        if (!list) {
            return 0;
        }
        if (isArray(list)) {
            return list.length;
        }
        return objSize(list);
    }

    return size;

});

define('deferreds/pipe',['require','./Deferred','mout/lang/isArray','mout/lang/toArray','mout/function/partial','./anyToDeferred','mout/object/keys','mout/collection/size'],function(require) {

	var Deferred = require('./Deferred');
	var isArray = require('mout/lang/isArray');
	var toArray = require('mout/lang/toArray');
	var partial = require('mout/function/partial');
	var anyToDeferred = require('./anyToDeferred');
	var objkeys = require('mout/object/keys');
	var size = require('mout/collection/size');


	/**
	 * Executes all passed Functions one at a time, each time passing the
	 * result to the next function in the chain.
	 * @param {Any} tasks
	 * @return {Promise}
	 */
	var pipe = function(tasks) {

		var superDeferred = new Deferred();

		if (arguments.length > 1) {
			tasks = toArray(arguments);
		}

		if (!size(tasks)) {
			superDeferred.reject();
			return superDeferred;
		}

		var completed = 0;
		var keys;
		if (!isArray(tasks)) {
			keys = objkeys(tasks);
		}

		var iterate = function() {
			var task;
			var key;

			if (isArray(tasks)) {
				key = completed;
				task = tasks[key];
			}
			else {
				key = keys[completed];
				task = tasks[key];
			}

			var args = toArray(arguments);
			args.unshift(task);
			anyToDeferred( partial.apply(task, args) ).then(
				function() {
					completed += 1;
					if (completed === size(tasks)) {
						superDeferred.resolve.apply(superDeferred, arguments);
					}
					else {
						iterate.apply(superDeferred, arguments);
					}
				},
				function() {
					superDeferred.reject.apply(superDeferred, arguments);
				}
			);
		};

		iterate();

		return superDeferred.promise();

	};


	return pipe;

});

define('plugin/chain',['require','mout/object/forOwn','mout/object/merge','mout/lang/toArray','deferreds/pipe'],function(require) {

	

	var forOwn = require('mout/object/forOwn');
	var merge = require('mout/object/merge');
	var toArray = require('mout/lang/toArray');
	var pipe = require('deferreds/pipe');


	var makeChains = function(constructor) {
		var meta = constructor._meta;
		var proto = constructor.prototype;

		meta.chains = meta.members.__chains || {};

		meta.bases.slice(0).reverse().forEach(function(base) {
			meta.chains = merge(meta.chains, base._meta.chains);
		});

		forOwn(meta.chains, function(type, key) {
			var bases = meta.bases.slice(0); //don't modify passed bases

			//first/last in the chain should be this constructor
			bases.unshift(constructor);

			if (type === 'after') {
				bases = bases.reverse();
			}

			proto[key] = function() {
				var args = toArray(arguments);

				bases = bases.filter(function(base) {
					return base._meta.members.hasOwnProperty(key);
				});

				var methods = bases.map(function(base) {
					return base._meta.members[key].bind(this);
				}.bind(this));

				if (args.length) {
					//first argument is passed as an argument to the first
					//method
					methods.unshift(args);
				}

				return pipe(methods);
			};
		});
	};


	return makeChains;

});

define('plugin/clone',['require','../util/forceNew','../util/isElement','mout/object/forOwn','mout/lang/kindOf','mout/lang/isFunction'],function(require) {

	

	var forceNew = require('../util/forceNew');
	var isElement = require('../util/isElement');
	var forOwn = require('mout/object/forOwn');
	var kindOf = require('mout/lang/kindOf');
	var isFunction = require('mout/lang/isFunction');


	//modified from mout's lang/clone
	function clone(val){
		var result;

		//don't clone DOM nodes (or jquery objects)
		if (isElement(val)) {
			result = val;
			return result;
		}

		switch ( kindOf(val) ) {
			case 'Object':
				result = cloneObject(val);
				break;
			case 'Array':
				result = cloneArray(val);
				break;
			case 'RegExp':
				result = cloneRegExp(val);
				break;
			case 'Date':
				result = cloneDate(val);
				break;
			default:
				result = val;
		}

		return result;
	}


	function cloneObject(source) {
		//object with a clone() method: respect its clone method
		//(should return a true instance of something, rather than a
		//plain object like cloneObject)
		if (source.clone && isFunction(source.clone)) {
			return source.clone();
		}

		var out = {};
		forOwn(source, function(val, key) {
			out[key] = clone(val);
		});
		return out;
	}


	function cloneRegExp(r){
		var flags = '';
		flags += r.multiline ? 'm' : '';
		flags += r.global ? 'g' : '';
		flags += r.ignoreCase ? 'i' : '';
		return new RegExp(r.source, flags);
	}


	function cloneDate(date){
		return new Date( date.getTime() );
	}


	function cloneArray(arr){
		var out = [];
		var i = -1;
		var n = arr.length;
		while (++i < n) {
			out[i] = clone(arr[i]);
		}
		return out;
	}


	var makeClone = function(constructor) {
		var proto = constructor.prototype;

		proto.clone = function() {
			var ret = forceNew(this.constructor);
			forOwn(this, function(val, key) {
				ret[key] = clone(val);
			});
			return ret;
		};
	};


	return makeClone;

});

// Domain Public by Eric Wendelin http://eriwen.com/ (2008)
//                  Luke Smith http://lucassmith.name/ (2008)
//                  Loic Dachary <loic@dachary.org> (2008)
//                  Johan Euphrosine <proppy@aminche.com> (2008)
//                  Oyvind Sean Kinsey http://kinsey.no/blog (2010)
//                  Victor Homyakov <victor-homyakov@users.sourceforge.net> (2010)

/**
 * Main function giving a function stack trace with a forced or passed in Error
 *
 * @cfg {Error} e The error to create a stacktrace from (optional)
 * @cfg {Boolean} guess If we should try to resolve the names of anonymous functions
 * @return {Array} of Strings with functions, lines, files, and arguments where possible
 */
function printStackTrace(options) {
    options = options || {guess: true};
    var ex = options.e || null, guess = !!options.guess;
    var p = new printStackTrace.implementation(), result = p.run(ex);
    return (guess) ? p.guessAnonymousFunctions(result) : result;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = printStackTrace;
}

printStackTrace.implementation = function() {
};

printStackTrace.implementation.prototype = {
    /**
     * @param {Error} ex The error to create a stacktrace from (optional)
     * @param {String} mode Forced mode (optional, mostly for unit tests)
     */
    run: function(ex, mode) {
        ex = ex || this.createException();
        // examine exception properties w/o debugger
        //for (var prop in ex) {alert("Ex['" + prop + "']=" + ex[prop]);}
        mode = mode || this.mode(ex);
        if (mode === 'other') {
            return this.other(arguments.callee);
        } else {
            return this[mode](ex);
        }
    },

    createException: function() {
        try {
            this.undef();
        } catch (e) {
            return e;
        }
    },

    /**
     * Mode could differ for different exception, e.g.
     * exceptions in Chrome may or may not have arguments or stack.
     *
     * @return {String} mode of operation for the exception
     */
    mode: function(e) {
        if (e['arguments'] && e.stack) {
            return 'chrome';
        } else if (e.stack && e.sourceURL) {
            return 'safari';
        } else if (e.stack && e.number) {
            return 'ie';
        } else if (typeof e.message === 'string' && typeof window !== 'undefined' && window.opera) {
            // e.message.indexOf("Backtrace:") > -1 -> opera
            // !e.stacktrace -> opera
            if (!e.stacktrace) {
                return 'opera9'; // use e.message
            }
            // 'opera#sourceloc' in e -> opera9, opera10a
            if (e.message.indexOf('\n') > -1 && e.message.split('\n').length > e.stacktrace.split('\n').length) {
                return 'opera9'; // use e.message
            }
            // e.stacktrace && !e.stack -> opera10a
            if (!e.stack) {
                return 'opera10a'; // use e.stacktrace
            }
            // e.stacktrace && e.stack -> opera10b
            if (e.stacktrace.indexOf("called from line") < 0) {
                return 'opera10b'; // use e.stacktrace, format differs from 'opera10a'
            }
            // e.stacktrace && e.stack -> opera11
            return 'opera11'; // use e.stacktrace, format differs from 'opera10a', 'opera10b'
        } else if (e.stack) {
            return 'firefox';
        }
        return 'other';
    },

    /**
     * Given a context, function name, and callback function, overwrite it so that it calls
     * printStackTrace() first with a callback and then runs the rest of the body.
     *
     * @param {Object} context of execution (e.g. window)
     * @param {String} functionName to instrument
     * @param {Function} function to call with a stack trace on invocation
     */
    instrumentFunction: function(context, functionName, callback) {
        context = context || window;
        var original = context[functionName];
        context[functionName] = function instrumented() {
            callback.call(this, printStackTrace().slice(4));
            return context[functionName]._instrumented.apply(this, arguments);
        };
        context[functionName]._instrumented = original;
    },

    /**
     * Given a context and function name of a function that has been
     * instrumented, revert the function to it's original (non-instrumented)
     * state.
     *
     * @param {Object} context of execution (e.g. window)
     * @param {String} functionName to de-instrument
     */
    deinstrumentFunction: function(context, functionName) {
        if (context[functionName].constructor === Function &&
                context[functionName]._instrumented &&
                context[functionName]._instrumented.constructor === Function) {
            context[functionName] = context[functionName]._instrumented;
        }
    },

    /**
     * Given an Error object, return a formatted Array based on Chrome's stack string.
     *
     * @param e - Error object to inspect
     * @return Array<String> of function calls, files and line numbers
     */
    chrome: function(e) {
        var stack = (e.stack + '\n').replace(/^\S[^\(]+?[\n$]/gm, '').
          replace(/^\s+(at eval )?at\s+/gm, '').
          replace(/^([^\(]+?)([\n$])/gm, '{anonymous}()@$1$2').
          replace(/^Object.<anonymous>\s*\(([^\)]+)\)/gm, '{anonymous}()@$1').split('\n');
        stack.pop();
        return stack;
    },

    /**
     * Given an Error object, return a formatted Array based on Safari's stack string.
     *
     * @param e - Error object to inspect
     * @return Array<String> of function calls, files and line numbers
     */
    safari: function(e) {
        return e.stack.replace(/\[native code\]\n/m, '')
            .replace(/^(?=\w+Error\:).*$\n/m, '')
            .replace(/^@/gm, '{anonymous}()@')
            .split('\n');
    },

    /**
     * Given an Error object, return a formatted Array based on IE's stack string.
     *
     * @param e - Error object to inspect
     * @return Array<String> of function calls, files and line numbers
     */
    ie: function(e) {
        var lineRE = /^.*at (\w+) \(([^\)]+)\)$/gm;
        return e.stack.replace(/at Anonymous function /gm, '{anonymous}()@')
            .replace(/^(?=\w+Error\:).*$\n/m, '')
            .replace(lineRE, '$1@$2')
            .split('\n');
    },

    /**
     * Given an Error object, return a formatted Array based on Firefox's stack string.
     *
     * @param e - Error object to inspect
     * @return Array<String> of function calls, files and line numbers
     */
    firefox: function(e) {
        return e.stack.replace(/(?:\n@:0)?\s+$/m, '').replace(/^[\(@]/gm, '{anonymous}()@').split('\n');
    },

    opera11: function(e) {
        var ANON = '{anonymous}', lineRE = /^.*line (\d+), column (\d+)(?: in (.+))? in (\S+):$/;
        var lines = e.stacktrace.split('\n'), result = [];

        for (var i = 0, len = lines.length; i < len; i += 2) {
            var match = lineRE.exec(lines[i]);
            if (match) {
                var location = match[4] + ':' + match[1] + ':' + match[2];
                var fnName = match[3] || "global code";
                fnName = fnName.replace(/<anonymous function: (\S+)>/, "$1").replace(/<anonymous function>/, ANON);
                result.push(fnName + '@' + location + ' -- ' + lines[i + 1].replace(/^\s+/, ''));
            }
        }

        return result;
    },

    opera10b: function(e) {
        // "<anonymous function: run>([arguments not available])@file://localhost/G:/js/stacktrace.js:27\n" +
        // "printStackTrace([arguments not available])@file://localhost/G:/js/stacktrace.js:18\n" +
        // "@file://localhost/G:/js/test/functional/testcase1.html:15"
        var lineRE = /^(.*)@(.+):(\d+)$/;
        var lines = e.stacktrace.split('\n'), result = [];

        for (var i = 0, len = lines.length; i < len; i++) {
            var match = lineRE.exec(lines[i]);
            if (match) {
                var fnName = match[1]? (match[1] + '()') : "global code";
                result.push(fnName + '@' + match[2] + ':' + match[3]);
            }
        }

        return result;
    },

    /**
     * Given an Error object, return a formatted Array based on Opera 10's stacktrace string.
     *
     * @param e - Error object to inspect
     * @return Array<String> of function calls, files and line numbers
     */
    opera10a: function(e) {
        // "  Line 27 of linked script file://localhost/G:/js/stacktrace.js\n"
        // "  Line 11 of inline#1 script in file://localhost/G:/js/test/functional/testcase1.html: In function foo\n"
        var ANON = '{anonymous}', lineRE = /Line (\d+).*script (?:in )?(\S+)(?:: In function (\S+))?$/i;
        var lines = e.stacktrace.split('\n'), result = [];

        for (var i = 0, len = lines.length; i < len; i += 2) {
            var match = lineRE.exec(lines[i]);
            if (match) {
                var fnName = match[3] || ANON;
                result.push(fnName + '()@' + match[2] + ':' + match[1] + ' -- ' + lines[i + 1].replace(/^\s+/, ''));
            }
        }

        return result;
    },

    // Opera 7.x-9.2x only!
    opera9: function(e) {
        // "  Line 43 of linked script file://localhost/G:/js/stacktrace.js\n"
        // "  Line 7 of inline#1 script in file://localhost/G:/js/test/functional/testcase1.html\n"
        var ANON = '{anonymous}', lineRE = /Line (\d+).*script (?:in )?(\S+)/i;
        var lines = e.message.split('\n'), result = [];

        for (var i = 2, len = lines.length; i < len; i += 2) {
            var match = lineRE.exec(lines[i]);
            if (match) {
                result.push(ANON + '()@' + match[2] + ':' + match[1] + ' -- ' + lines[i + 1].replace(/^\s+/, ''));
            }
        }

        return result;
    },

    // Safari 5-, IE 9-, and others
    other: function(curr) {
        var ANON = '{anonymous}', fnRE = /function\s*([\w\-$]+)?\s*\(/i, stack = [], fn, args, maxStackSize = 10;
        while (curr && curr['arguments'] && stack.length < maxStackSize) {
            fn = fnRE.test(curr.toString()) ? RegExp.$1 || ANON : ANON;
            args = Array.prototype.slice.call(curr['arguments'] || []);
            stack[stack.length] = fn + '(' + this.stringifyArguments(args) + ')';
            curr = curr.caller;
        }
        return stack;
    },

    /**
     * Given arguments array as a String, subsituting type names for non-string types.
     *
     * @param {Arguments} args
     * @return {Array} of Strings with stringified arguments
     */
    stringifyArguments: function(args) {
        var result = [];
        var slice = Array.prototype.slice;
        for (var i = 0; i < args.length; ++i) {
            var arg = args[i];
            if (arg === undefined) {
                result[i] = 'undefined';
            } else if (arg === null) {
                result[i] = 'null';
            } else if (arg.constructor) {
                if (arg.constructor === Array) {
                    if (arg.length < 3) {
                        result[i] = '[' + this.stringifyArguments(arg) + ']';
                    } else {
                        result[i] = '[' + this.stringifyArguments(slice.call(arg, 0, 1)) + '...' + this.stringifyArguments(slice.call(arg, -1)) + ']';
                    }
                } else if (arg.constructor === Object) {
                    result[i] = '#object';
                } else if (arg.constructor === Function) {
                    result[i] = '#function';
                } else if (arg.constructor === String) {
                    result[i] = '"' + arg + '"';
                } else if (arg.constructor === Number) {
                    result[i] = arg;
                }
            }
        }
        return result.join(',');
    },

    sourceCache: {},

    /**
     * @return the text from a given URL
     */
    ajax: function(url) {
        var req = this.createXMLHTTPObject();
        if (req) {
            try {
                req.open('GET', url, false);
                //req.overrideMimeType('text/plain');
                //req.overrideMimeType('text/javascript');
                req.send(null);
                //return req.status == 200 ? req.responseText : '';
                return req.responseText;
            } catch (e) {
            }
        }
        return '';
    },

    /**
     * Try XHR methods in order and store XHR factory.
     *
     * @return <Function> XHR function or equivalent
     */
    createXMLHTTPObject: function() {
        var xmlhttp, XMLHttpFactories = [
            function() {
                return new XMLHttpRequest();
            }, function() {
                return new ActiveXObject('Msxml2.XMLHTTP');
            }, function() {
                return new ActiveXObject('Msxml3.XMLHTTP');
            }, function() {
                return new ActiveXObject('Microsoft.XMLHTTP');
            }
        ];
        for (var i = 0; i < XMLHttpFactories.length; i++) {
            try {
                xmlhttp = XMLHttpFactories[i]();
                // Use memoization to cache the factory
                this.createXMLHTTPObject = XMLHttpFactories[i];
                return xmlhttp;
            } catch (e) {
            }
        }
    },

    /**
     * Given a URL, check if it is in the same domain (so we can get the source
     * via Ajax).
     *
     * @param url <String> source url
     * @return False if we need a cross-domain request
     */
    isSameDomain: function(url) {
        return typeof location !== "undefined" && url.indexOf(location.hostname) !== -1; // location may not be defined, e.g. when running from nodejs.
    },

    /**
     * Get source code from given URL if in the same domain.
     *
     * @param url <String> JS source URL
     * @return <Array> Array of source code lines
     */
    getSource: function(url) {
        // TODO reuse source from script tags?
        if (!(url in this.sourceCache)) {
            this.sourceCache[url] = this.ajax(url).split('\n');
        }
        return this.sourceCache[url];
    },

    guessAnonymousFunctions: function(stack) {
        for (var i = 0; i < stack.length; ++i) {
            var reStack = /\{anonymous\}\(.*\)@(.*)/,
                reRef = /^(.*?)(?::(\d+))(?::(\d+))?(?: -- .+)?$/,
                frame = stack[i], ref = reStack.exec(frame);

            if (ref) {
                var m = reRef.exec(ref[1]);
                if (m) { // If falsey, we did not get any file/line information
                    var file = m[1], lineno = m[2], charno = m[3] || 0;
                    if (file && this.isSameDomain(file) && lineno) {
                        var functionName = this.guessAnonymousFunction(file, lineno, charno);
                        stack[i] = frame.replace('{anonymous}', functionName);
                    }
                }
            }
        }
        return stack;
    },

    guessAnonymousFunction: function(url, lineNo, charNo) {
        var ret;
        try {
            ret = this.findFunctionName(this.getSource(url), lineNo);
        } catch (e) {
            ret = 'getSource failed with url: ' + url + ', exception: ' + e.toString();
        }
        return ret;
    },

    findFunctionName: function(source, lineNo) {
        // FIXME findFunctionName fails for compressed source
        // (more than one function on the same line)
        // function {name}({args}) m[1]=name m[2]=args
        var reFunctionDeclaration = /function\s+([^(]*?)\s*\(([^)]*)\)/;
        // {name} = function ({args}) TODO args capture
        // /['"]?([0-9A-Za-z_]+)['"]?\s*[:=]\s*function(?:[^(]*)/
        var reFunctionExpression = /['"]?([$_A-Za-z][$_A-Za-z0-9]*)['"]?\s*[:=]\s*function\b/;
        // {name} = eval()
        var reFunctionEvaluation = /['"]?([$_A-Za-z][$_A-Za-z0-9]*)['"]?\s*[:=]\s*(?:eval|new Function)\b/;
        // Walk backwards in the source lines until we find
        // the line which matches one of the patterns above
        var code = "", line, maxLines = Math.min(lineNo, 20), m, commentPos;
        for (var i = 0; i < maxLines; ++i) {
            // lineNo is 1-based, source[] is 0-based
            line = source[lineNo - i - 1];
            commentPos = line.indexOf('//');
            if (commentPos >= 0) {
                line = line.substr(0, commentPos);
            }
            // TODO check other types of comments? Commented code may lead to false positive
            if (line) {
                code = line + code;
                m = reFunctionExpression.exec(code);
                if (m && m[1]) {
                    return m[1];
                }
                m = reFunctionDeclaration.exec(code);
                if (m && m[1]) {
                    //return m[1] + "(" + (m[2] || "") + ")";
                    return m[1];
                }
                m = reFunctionEvaluation.exec(code);
                if (m && m[1]) {
                    return m[1];
                }
            }
        }
        return '(?)';
    }
};

define("stacktrace", (function (global) {
    return function () {
        var ret, fn;
        return ret || global.printStackTrace;
    };
}(this)));

/*jshint strict:false*/
define('plugin/guessName',['require','stacktrace'],function(require) {

	var stacktrace = require('stacktrace');


	/*
	 * Convention: if the result of the call to create() or extend() is
	 * assigned to a variable, we use that name as the class name
	 */
	var guessName = function(constructor) {
		var trace = new stacktrace.implementation();
		var stack = trace.run(null);

		var guessNamePos;
		stack.every(function(line, i) {
			if (line.search(/\/plugin\/guessName\.js/) !== -1) {
				guessNamePos = i;
				return false;
			}
			return true;
		});

		if (!guessNamePos) {
			return;
		}

		var declarationPos = guessNamePos + 2;
		var parts = stack[declarationPos].match(/^.*?\((.*?)(?::(\d+))(?::(\d+))/);

		if (!parts) {
			parts = stack[declarationPos].match(/^\s*at\s*(.*?)(?::(\d+))(?::(\d+))$/);
		}

		var file = parts[1];
		var source = trace.getSource(file);

		if (!source || !source.length) {
			return;
		}

		var lineno = parts[2];
		var line = source[lineno - 1];

		//e.g. var (name) = create({...
		var rClassCreate = /^\s*?(?:var)?\s*?(\S+?)\s*?=\s*?create/;
		//e.g. var (name) = (Superclass).extend({...
		var rClassExtend = /^\s*?(?:var)?\s*?(\S+?)\s*?=\s*?(\S+?)\.extend/;

		var matches = line.match(rClassCreate);

		if (!matches) {
			matches = line.match(rClassExtend);
		}

		if (!matches) {
			return;
		}

		constructor._meta.name = matches[1];

	};


	return guessName;

});

/*jshint strict:false*/
define('plugin/super',['require','mout/object/forOwn','mout/object/filter','mout/lang/isFunction'],function(require) {

	var forOwn = require('mout/object/forOwn');
	var filter = require('mout/object/filter');
	var isFunction = require('mout/lang/isFunction');


	var superMethod = function() {
		var curr = this._super.curr;
		if (!curr) {
			curr = this._super.curr = {};
			//keep a pointer to which base class we're operating on, so that
			//upstream _super calls are directed to methods progressively
			//higher in the chain
			curr.pos = 0;
			//Function.caller is expensive. We can cache it across _super calls
			//within the same function chain (same-named)
			curr.key = superMethod.caller.nom;
		}

		var list = this.constructor._meta.superList;
		curr.fn = list[curr.key] && list[curr.key][curr.pos];
		curr.pos++;

		if (!curr.fn) {
			var className = this.constructor._meta.name;
			var err = className + '#' + curr.key + ': no method by this name in superclasses (';
			err += [className].concat(
				this.constructor._meta.bases.map(function(base) {
					return base._meta.name;
				})
			).join(' > ');
			err += ')';
			throw new Error(err);
		}

		var ret = curr.fn.apply(this, arguments);
		this._super.curr = null;
		return ret;
	};


	var makeSuper = function(constructor) {
		var meta = constructor._meta;
		var proto = constructor.prototype;

		//cache of which base methods should be used for each _super method,
		//and in what order
		meta.superList = {};

		forOwn(filter(meta.members, isFunction), function(member, key) {
			proto[key].nom = key;
			meta.superList[key] = meta.bases
				.filter(function(base) {
					return base._meta.members.hasOwnProperty(key);
				})
				.map(function(base) {
					return base._meta.members[key];
				});
		});

		proto._super = superMethod;
	};


	return makeSuper;

});

define('util/ObjectProxy',['require','mout/lang/isObject','mout/object/forOwn','mout/object/size'],function(require) {

	

	var isObject = require('mout/lang/isObject');
	var forOwn = require('mout/object/forOwn');
	var size = require('mout/object/size');


	var ObjectProxy = function(opts) {

		if (!opts.target) {
			this._data = {
				target: opts,
				props: {},
				descriptors: {},
				proxies: {}
			};
		}
		else {
			this._data = {
				key: opts.key,
				isChild: opts.isChild,
				context: opts.context,
				target: opts.target,
				props: {},
				descriptors: opts.descriptors || {},
				proxies: {}
			};
		}

		Object.keys(this._data.target).forEach(function(key) {
			this._data.props[key] = true;
		}.bind(this));

		//add properties to the tree which were defined in descriptors but may
		//not yet exist in target
		if (this._data.descriptors && !this._data.isChild) {
			forOwn(this._data.descriptors, function(descriptor, key) {
				this._data.props[key] = true;
				//this._data.tree.setNode(key, null);

				//bind all descriptors to opts.context, if given
				if (descriptor.get && this._data.context) {
					descriptor.get = descriptor.get.bind(this._data.context);
				}

				if (descriptor.set && this._data.context) {
					descriptor.set = descriptor.set.bind(this._data.context);
				}
			}.bind(this));
		}

		this._defineProps();

	};


	var _subProps = function(name, props) {
		var ret = {};
		var rSubName = new RegExp('^' + name + '\\.');

		Object.keys(props).filter(function(key) {
			return (key.search(rSubName) !== -1);
		}).forEach(function(key) {
			var shortName = key.replace(rSubName, '');
			ret[shortName] = props[key];
		});

		return ret;
	};


	ObjectProxy.prototype._defineProps = function() {
		forOwn(this._data.props, function(obj, key) {
			if (key.search(/\./g) !== -1) {
				return;
			}

			var descriptor = {};

			if (isObject(this._data.target[key]) && size(this._data.target[key])) {
				this._data.proxies[key] = this._data.proxies[key] || new ObjectProxy({
					key: key,
					isChild: true,
					context: this._data.context,
					target: this._data.target[key],
					descriptors: _subProps(key, this._data.descriptors),
					props: _subProps(key, this._data.props)
				});

				descriptor.get = function() {
					return this._data.proxies[key];
				};
			}
			else {
				descriptor.get = (this._data.descriptors[key] && this._data.descriptors[key].get) || function() {
					return this._data.target[key];
				};
			}

			descriptor.set = this._set.bind(this, key);
			descriptor.configurable = true;

			Object.defineProperty(this, key, descriptor);
		}.bind(this));
	};


	//recursively set children of the current target
	ObjectProxy.prototype._set = function(key, val) {

		if (arguments.length === 1) {
			val = key;
			key = null;
		}

		//setting properties on this._data.target directly
		if (!key) {
			forOwn(val, function(obj, key) {
				this._set(key, obj);
			}.bind(this));
			return;
		}

		//setting a child of this._data.target

		//new property added. set new sub-proxy.
		if (isObject(val) && !isObject(this._data.target[key])) {
			this._data.target[key] = val;
			this._defineProps();
			this._data.proxies[key]._set(val);
			return;
		}

		if (isObject(val)) {
			this._data.proxies[key]._set(val);
			return;
		}

		var setter = (this._data.descriptors[key] && this._data.descriptors[key].set) ||
			function(val) {
				this._data.target[key] = val;
			}.bind(this);
		setter(val);

	};


	return ObjectProxy;

});

define('plugin/props',['require','mout/object/forOwn','mout/lang/isObject','mout/object/merge','../util/ObjectProxy'],function(require) {

	

	var forOwn = require('mout/object/forOwn');
	var isObject = require('mout/lang/isObject');
	var merge = require('mout/object/merge');
	var ObjectProxy = require('../util/ObjectProxy');


	var _defineProxy = function(context, descriptors) {
		return new ObjectProxy({
			context: context,
			target: context._data,
			descriptors: descriptors
		});
	};


	//clone descriptors, because ObjectProxy binds them to the `context` object
	var _clone = function(descriptors) {
		var result = {};
		Object.keys(descriptors).forEach(function(key) {
			var descriptor = descriptors[key];
			result[key] = {
				get: descriptor.get,
				set: descriptor.set
			};
		});
		return result;
	};


	var makeProps = function(constructor) {

		var meta = constructor._meta;
		var proto = constructor.prototype;

		meta.descriptors = {};
		meta.bases.slice(0).reverse().forEach(function(base) {
			meta.descriptors = merge(meta.descriptors, base._meta.descriptors);
		});

		//find members of proto which have 'get' and/or 'set' properties
		Object.keys(proto)
			.filter(function(key) {
				return (
					isObject(proto[key]) &&
					Object.keys(proto[key]).length <= 2 &&
					(
						proto[key].hasOwnProperty('get') ||
						proto[key].hasOwnProperty('set')
					)
				);
			})
			.forEach(function(key) {
				meta.descriptors[key] = meta.descriptors[key] || {};
				meta.descriptors[key].get = proto[key].get;
				meta.descriptors[key].set = proto[key].set;

				if (!proto[key].hasOwnProperty('set')) {
					meta.descriptors[key].set = function() {
						throw new Error(key + ' is a read-only property');
					};
				}
			});

		//if they don't exist, make placeholders for parents of nested
		//properties
		Object.keys(meta.descriptors)
			.filter(function(key) {
				return key.search(/\./) !== -1;
			})
			.forEach(function(key) {
				var parts = key.split('.');
				for (var i = 0, len = parts.length; i < len - 1; i++) {
					parts.pop();
					var path = parts.join('.');
					meta.descriptors[path] = meta.descriptors[path] || {};
					meta.descriptors[path].get = meta.descriptors[path].get || null;
					meta.descriptors[path].set = meta.descriptors[path].set || null;
				}
			});


		//if any properties have '.' in the name, they'll be accessed through an
		//ObjectProxy
		forOwn(meta.descriptors, function(descriptor, name) {
			var children = Object.keys(meta.descriptors).filter(function(key) {
				return (key.search(new RegExp('^' + name + '\\.')) !== -1);
			});

			if (children.length !== 0) {
				descriptor.hasChildren = true;
			}

			delete proto[name];
		});

		//make properties for direct children of proto, and proxies for deeper
		//children
		Object.keys(meta.descriptors)
			.filter(function(key) {
				//direct children of proto
				return key.search(/\./) === -1;
			})
			.forEach(function(key) {
				var descriptor = meta.descriptors[key];

				if (descriptor.hasChildren) {
					descriptor.get = function() {
						this._proxy = this._proxy || _defineProxy(this, _clone(meta.descriptors));
						return this._proxy[key];
					};

					descriptor.set = function(val) {
						this._proxy = this._proxy || _defineProxy(this, _clone(meta.descriptors));
						this._proxy[key]._set(val);
					};
				}

				Object.defineProperty(proto, key, {
					get: descriptor.get || function() {
						return this._data[key];
					},
					set: descriptor.set || function(val) {
						this._data[key] = val;
					}
				});
			});

	};


	return makeProps;

});

/*jshint evil:true, strict:false */
define('create',['require','./basicCreate','./makeConstructor','./util/forceNew','./util/defaults','./plugin/apply','./plugin/chain','./plugin/clone','./plugin/guessName','./plugin/super','./plugin/props'],function(require) {

	var basicCreate = require('./basicCreate');
	var makeConstructor = require('./makeConstructor');
	var forceNew = require('./util/forceNew');
	var defaults = require('./util/defaults');
	var plugin = {
		apply: require('./plugin/apply'),
		chain: require('./plugin/chain'),
		clone: require('./plugin/clone'),
		guessName: require('./plugin/guessName'),
		_super: require('./plugin/super'),
		props: require('./plugin/props')
	};


	//the actual constructor function (invoked with the `new` operator)
	var ctorFn = function(meta) {
		return function $Class(other) {
			//signal minifiers to avoid mangling names in this eval'd scope
			eval('');

			//this following is eval'd from class/create, in order
			//to override the constructor name given in common debuggers
			//more: http://stackoverflow.com/questions/8073055/minor-drawback-with-crockford-prototypical-inheritance/8076515
		
			if(!(this instanceof $Class)){
				// not called via new, so force it
				var instance = forceNew($Class);
				$Class.apply(instance, arguments);
				return instance;
			}

			//copy constructor for instances of this or any superclasses
			if (arguments.length === 1 && (other.constructor === $Class || meta.bases.indexOf(other.constructor) !== -1)) {
				this._data = other.clone()._data;
				return;
			}

			//special _data member of each class is, by convention, used to
			//hold all instance-specific "private" data.
			this._data = defaults({}, meta.defaults);

			//give user the opportunity to override return value
			return meta.ctor.apply(this, arguments);
		};
	};


	/**
	 * @param {String} [className]
	 * @param {...Constructor} [superclasses]
	 * @param {Object} members
	 * @return {Constructor}
	 */
	var create = function() {

		/*
		 * ----------------------------------------------------------------------
		 * Step 1:
		 * Make a basic constructor with just inheritance info
		 * ----------------------------------------------------------------------
		 */

		var constructor = basicCreate.apply(undefined, arguments);
		var proto = constructor.prototype;
		var meta = constructor._meta;


		/*
		 * ----------------------------------------------------------------------
		 * Step 2:
		 * Augment the constructor's prototype object or `_meta` metadata
		 * ----------------------------------------------------------------------
		 */

		//_super() method
		plugin._super(constructor);

		//clone() method
		plugin.clone(constructor);

		//_apply() method
		plugin.apply(constructor);

		//AOP-style 'after' or 'before' method chaining
		plugin.chain(constructor);

		//ES5 properties for members like {get: fn, set: fn}
		plugin.props(constructor);

		//attempt to guess class name from source
		plugin.guessName(constructor);

		//initialize the `_data` member upon construction
		meta.defaults = meta.members.__defaults || {};


		/*
		 * ----------------------------------------------------------------------
		 * Step 3:
		 * Replace the basic constructor
		 * ----------------------------------------------------------------------
		 */

		constructor = makeConstructor(
			//see ctorFn() above for explanation of why eval() is used here
			eval('1&&function ' + ctorFn(meta).toString().replace(/\$Class/g, meta.name).replace(/^function\s+/, '')),
			proto,
			meta
		);


		/*
		 * ----------------------------------------------------------------------
		 * Step 4:
		 * Augment the constructor with any new static methods
		 * ----------------------------------------------------------------------
		 */

		constructor.extend = create.bind(create, constructor);

		return constructor;

	};


	return create;

});

define('Class',['require','./create'],function(require) {

	

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


/*
-----------------------------------------
Global definitions for a built project
-----------------------------------------
*/

return {
	"mout/lang/kindOf": require("mout/lang/kindOf"),
	"mout/lang/toArray": require("mout/lang/toArray"),
	"mout/lang/isKind": require("mout/lang/isKind"),
	"mout/lang/isString": require("mout/lang/isString"),
	"mout/object/hasOwn": require("mout/object/hasOwn"),
	"mout/object/forIn": require("mout/object/forIn"),
	"mout/object/forOwn": require("mout/object/forOwn"),
	"methodResolutionOrder": require("methodResolutionOrder"),
	"makeConstructor": require("makeConstructor"),
	"basicCreate": require("basicCreate"),
	"util/forceNew": require("util/forceNew"),
	"mout/collection/make_": require("mout/collection/make_"),
	"mout/array/forEach": require("mout/array/forEach"),
	"mout/collection/forEach": require("mout/collection/forEach"),
	"mout/lang/isObject": require("mout/lang/isObject"),
	"util/isElement": require("util/isElement"),
	"util/defaults": require("util/defaults"),
	"mout/object/filter": require("mout/object/filter"),
	"plugin/apply": require("plugin/apply"),
	"mout/lang/isPlainObject": require("mout/lang/isPlainObject"),
	"mout/object/mixIn": require("mout/object/mixIn"),
	"mout/lang/clone": require("mout/lang/clone"),
	"mout/lang/deepClone": require("mout/lang/deepClone"),
	"mout/object/merge": require("mout/object/merge"),
	"deferreds/forceNew": require("deferreds/forceNew"),
	"mout/lang/isArray": require("mout/lang/isArray"),
	"mout/function/bind": require("mout/function/bind"),
	"deferreds/isDeferred": require("deferreds/isDeferred"),
	"deferreds/isPromise": require("deferreds/isPromise"),
	"deferreds/Promise": require("deferreds/Promise"),
	"deferreds/Deferred": require("deferreds/Deferred"),
	"mout/function/partial": require("mout/function/partial"),
	"mout/lang/isFunction": require("mout/lang/isFunction"),
	"deferreds/anyToDeferred": require("deferreds/anyToDeferred"),
	"mout/object/keys": require("mout/object/keys"),
	"mout/object/size": require("mout/object/size"),
	"mout/collection/size": require("mout/collection/size"),
	"deferreds/pipe": require("deferreds/pipe"),
	"plugin/chain": require("plugin/chain"),
	"plugin/clone": require("plugin/clone"),
	"stacktrace": require("stacktrace"),
	"plugin/guessName": require("plugin/guessName"),
	"plugin/super": require("plugin/super"),
	"util/ObjectProxy": require("util/ObjectProxy"),
	"plugin/props": require("plugin/props"),
	"create": require("create"),
	"Class": require("Class")
};


})();