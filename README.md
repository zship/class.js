Documentation is in progress; more on the wiki pages.

class.js
========

class.js is a modular library (using AMD conventions) for simulating classical
inheritance. It is modeled after
[dojo/_base/declare](http://dojotoolkit.org/reference-guide/1.8/dojo/_base/declare.html#dojo-base-declare),
but designed to be customizable. Here are its default features:

* Multiple inheritance
* Optional usage of `new`
* Copy constructor
* [[super() method|Plugins:-super]]
* [[ES5 Properties (Getters/Setters)|Plugins:-props]]
* [[AOP-style method chaining|Plugins:-chain]]
* [[clone() method|Plugins:-clone]]
* Sets class names to be able to display in all debuggers
* Guesses class names from source
* Compatible with consumer code using [ES5 Strict
  mode](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Functions_and_function_scope/Strict_mode)


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



class/create
------------

`class/create` is the direct analogue of `dojo/_base/declare`. It is a function
which produces a standard JavaScript constructor function (which class.js calls a
"class") given three arguments:

* {String} [className]
  * the name of the class to display in debuggers
* {...Constructor} [superclasses]
  * any number of superclasses (previously output by `class/create`)
* {Object} members
  * the "instance members" of the class

`class/create` is the heart of this library. It's the main entry point for
anyone wishing to hack on class.js. Whenever you want to create a new class,
you'll either want to require this module (to create a new class dojo-style via
`create()`) or `class/Class` (to create a new class via `Class.extend()`, which
is just sugar for `class/create`). Here's how `class/create` is used:

```js
var create = require('class/create');

//let's make a class representing a 2D rectangle
var Rect = create({
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




Customizing class/create
------------------------

By default, `class/create` generates classes with all of the plugins bundled
with class.js included. You can change which plugins are used by making your
own custom `create` function:

1. Copy `class/create.js` to somewhere in your application-specific .js files
2. Override the path to `class/create` in your AMD module loader. For
   RequireJS, that'd look like:
        require.config({
          baseUrl: 'js',
          paths: {
            'class/create': 'app/oop/create',
            ...
        });
3. Hack away on your copy. The comments in `class/create` walk you through the
   process of creating a constructor function, and it's a short file. If you
   ever want to switch back to the default, delete/comment the AMD path
   override.




Plugins
-------

Plugins are functions which accept one argument: the incomplete class
(constructor function). They read and/or mutate two properties of the class:
`_meta` (class.js introspection information) and `prototype` (the standard
JavaScript prototype object). **The main goal of a plugin is to add something
useful to** `prototype`, and hence to the eventual instances of the class.
