Documentation is in progress; more on the wiki pages.

class.js
========

class.js is a modular library (using AMD conventions) for simulating classical
inheritance. It is modeled after
[dojo/_base/declare](http://dojotoolkit.org/reference-guide/1.8/dojo/_base/declare.html#dojo-base-declare),
but designed to be customizable. Here are its default (most are optional!) features:

* Multiple inheritance
* Optional usage of `new`
* Copy constructor
* [super() method](https://github.com/zship/class.js/wiki/Plugins%3A-super)
* [ES5 Properties (Getters/Setters)](https://github.com/zship/class.js/wiki/Plugins%3A-props)
* [AOP-style method chaining](https://github.com/zship/class.js/wiki/Plugins%3A-chain)
* [clone() method](https://github.com/zship/class.js/wiki/Plugins%3A-clone)
* Compatible with consumer code which uses [ES5 Strict
  mode](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Functions_and_function_scope/Strict_mode)
* Debugging: Guesses class names from source
* Debugging: Class names can display in all debuggers
* Debugging: Sets the [displayName](http://www.alertdebugging.com/2009/04/29/building-a-better-javascript-profiler-with-webkit/) property for browsers which support it


Usage
-----

class.js exposes a single base class simply called `Class`. Client code uses
the static `Class.extend` method to make subclasses. `Class.extend` produces a
standard JavaScript constructor function (which class.js calls a "Class") given
one to three arguments:

* {String} [className]
  * the name of the class to display in debuggers
* {...Constructor} [superclasses]
  * any number of superclasses (which were output by `Class.extend`)
* {Object} members
  * the "instance members" of the class

```js
var Class = require('class/Class');

//let's make a class representing a 2D rectangle
var Rect = Class.extend({
	//called when the `new` operator is used e.g. var myRect = new Rect(...)
	constructor: function(top, left, width, height) {
		this.top = top;
		this.left = left;
		this.width = width;
		this.height = height;
	},
	translate: function(dx, dy) {
		this.top += dy;
		this.left += dx;
	}
});

var rect = new Rect(0, 0, 50, 50);
console.log(rect.top); //> 0
console.log(rect.left); //> 0
console.log(rect.width); //> 50
console.log(rect.height); //> 50

rect.translate(10, 10);
console.log(rect.top); //> 10
console.log(rect.left); //> 10
console.log(rect.width); //> 50
console.log(rect.height); //> 50
```


Why?
----

This has been done before. There's the aforementioned
[dojo/_base/declare](http://dojotoolkit.org/reference-guide/1.8/dojo/_base/declare.html#dojo-base-declare),
[js.class](http://jsclass.jcoglan.com/),
[base.js](http://dean.edwards.name/weblog/2006/03/base/), and [John Resig's
take on it](http://ejohn.org/blog/simple-javascript-inheritance/) to name a
few. Here's what characterizes class.js:

* Familiar
    * Tries to resemble C++, Java, and C# because of their
      [popularity](http://www.tiobe.com/index.php/content/paperinfo/tpci/index.html)
      and syntactic similarity to JavaScript.
    * At the same time, tries not to stray too far from JavaScript norms. That
      is, class definitions should resemble the common pattern of using a
      `mixin` or `extend` method on the prototype object. For example, class.js
      won't use string parsing to enable "public", "private", "protected"
      and/or "static" distinctions.
* Hackable
    * Kept as modular as possible to aid readability and facilitate overriding
      specific functionality
    * Emphasizes imperative rather than declarative style in library code
      (specifically with "plugins", actually call the damn function rather the
      "registering" it with something. No "magic", debugger-friendly.)
* Feature-packed
    * Using the AMD format makes it easy for users to completely strip out
      individual features' code, so class.js doesn't hold back.
    * At the same time, class.js is **only** a classical inheritance library.
      It contains no code that isn't directly related to that purpose (I'm
      looking at [js.class](http://jsclass.jcoglan.com/) here).
