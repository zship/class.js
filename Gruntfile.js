module.exports = function( grunt ) {

	"use strict";


	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),


		'amd-dist': {
			all: {
				options: {
					//remove requirejs dependency from built package (almond)
					standalone: true,
					//build standalone for node or browser
					env: 'node',
					//env: 'browser',
					exports: 'Class'
				},
				//Grunt files configuration object for which to trace dependencies
				//(more: http://gruntjs.com/configuring-tasks)
                files: [{
					src: 'src/Class.js',
					dest: 'dist/class.js'
				}]
			}
		},


		uglify: {
			all: {
				options: {
					banner: '/*! <%= pkg.title %> v<%= pkg.version %> | MIT license */\n'
				},
				files: [{
					src: 'dist/class.js',
					dest: 'dist/class.min.js'
				}]
			}
		},


		jshint: {
			src: {
				options: {
					jshintrc: 'src/.jshintrc'
				},
				files: {
					src: 'src/**/*.js'
				}
			},
			test: {
				options: {
					jshintrc: 'test/unit/.jshintrc'
				},
				files: {
					src: 'test/unit/**/*.js'
				}
			}
		},


		'amd-test': {
			mode: 'qunit',
			files: ['test/lib/es5-shim.js', 'test/unit/**/*.js']
		},


		qunit: {
			all: {
				files: {
					src: 'test/runner.html'
				},
				options: {
					'--web-security': false
					//'--remote-debugger-port': 9222
				}
			}
		},


		server: {
			port: 8080,
			base: '.'
		},


		'amd-check': {
			files: ['src/**/*.js', 'test/unit/**/*.js']
		},


		requirejs: {
			baseUrl: 'src',
			optimize: 'none',
			paths: {
				'mout': '../lib/mout',
				'deferreds': '../lib/deferreds',
				'stacktrace': '../lib/stacktrace/stacktrace'
			},
			shim: {
				'stacktrace': {
					exports: 'printStackTrace'
				}
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


	grunt.loadTasks('tasks/server');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-qunit');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-amd-dist');
	grunt.loadNpmTasks('grunt-amd-test');
	grunt.loadNpmTasks('grunt-amd-check');

	grunt.registerTask('test', ['amd-test', 'qunit']);
	grunt.registerTask('build', ['amd-dist', 'uglify']);

};
