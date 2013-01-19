module.exports = function( grunt ) {

	"use strict";


	grunt.initConfig({
		pkg: '<json:package.json>',


		meta: {
			banner: '/*! <%= pkg.title %> v<%= pkg.version %> | MIT license */'
		},


		dist: {
			out: 'dist/class.js',
			//remove requirejs dependency from built package (almond)
			standalone: true,
			//build standalone for node or browser
			env: 'node',
			//env: 'browser',
			exports: 'class',
			//String or Array of files for which to trace dependencies and build
			include: 'src/Class.js',
			//include: 'src/deferreds/waterfall.js',
			//exclude files from the 'include' list. Useful to add specific
			//exceptions to globbing.
			exclude: [],
			//exclude files and their dependencies from the *built* source
			//Difference from 'exclude': files in 'excludeBuilt' will be
			//excluded even if they are dependencies of files in 'include'
			excludeBuilt: [],
			//exclude files from the *built* source, but keep any dependencies of the files.
			excludeShallow: []
		},


		clean: [
			'<config:dist.out>',
			'<config:min.dist.dest>'
		],


		min: {
			dist: {
				src: ['<banner>', 'dist/class.js'],
				dest: 'dist/class.min.js'
			}
		},


		uglify: {
			codegen: {
				ascii_only: true,
				beautify: false,
				max_line_length: 1000
			}
		},


		lint: {
			files: 'src/**/*.js'
		},


		test: {
			include: ['src/**/*.js'],
			exclude: [],
			run: false
		},


		server: {
			port: 8000,
			base: '.'
		},


		checkrequire: {
			include: ['src/**/*.js', 'test/spec/**/*.js']
		},


		requirejs: {
			baseUrl: 'src',
			optimize: 'none',
			paths: {
				'mout': '../lib/mout',
				'deferreds': '../lib/deferreds'
			},
			keepBuildDir: true,
			locale: "en-us",
			useStrict: false,
			skipModuleInsertion: false,
			findNestedDependencies: false,
			removeCombined: false,
			preserveLicenseComments: false,
			logLevel: 0
		}

	});


	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-amd-dist');
	grunt.loadNpmTasks('grunt-amd-test');
	grunt.loadNpmTasks('grunt-amd-checkrequire');

};
