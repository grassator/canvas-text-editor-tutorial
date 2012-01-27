# JS Project Skeleton
This project tries to provide a nice starting point for your JavaScript projects whether it is browser-oriented library, full-fledged client app or node.js module.

Code is organized in [CommonJS](http://en.wikipedia.org/wiki/CommonJS) modules that can be [stitched](https://github.com/sstephenson/stitch) together for browser usage. All development dependencies are handled with [npm](http://npmjs.org/) and Makefile is provided to avoid typing in complex commands to run tests or build project.

Testing is handled with [mocha](http://visionmedia.github.com/mocha/) allowing for either TDD or BDD style tests. Since both **mocha** and **stitch** support [CoffeeScript](http://coffeescript.org/) you can choose to use it for your project if you like.

## Installation

Skeleton requires working installation of **node.js** and **npm** on a Linux or OS X.

Grab the [latest version](https://github.com/grassator/js-project-skeleton/zipball/master) of this repository and unpack it to the folder of your choosing. Then adjust name, description of the project and your personal info inside `package.json` file:

    "author": "You <you@domain.com>",
    "name": "sample_project",
    "description": "Some amazing project",

You should keep in mind that project name should be web friendly (i.e. alphanumeric characters and `_` or `-`). After that `cd` to your project folder in console and run:

    npm install

It will install all project dependencies into `node_modules` folder and you are good to go. To make sure that everything is working try running following command in your terminal:

    make build

It should create `build` folder with regular and minified versions of sample code.

## Development

Let's talk about how to use this skeleton.

### Project structure

First of all lets take a look at directory structure for your

* `build/` – contains stitched version of your code + minified file;
* `demo/` – for demonstration of browser-oriented projects;
* `lib/` – holds all of your app/lib code;
* `scripts/` – support folder for skeleton build and server scripts;
* `test/` – contains all the test cases;
* `vendor/` – for scripts that don't conform to CommonJS.

### Building

As described earlier in installation chapter:

    make build

creates stitched version of your project from `lib/` and `vendor/` folders. Filenames are the same as your project name specified in `package.json`.

### Testing

    make test

or

    npm test

runs all tests inside `test/` folder. By default tests use BDD style that can be changed by editing `test` target inside `Makefile`. You can learn more about **mocha** options in [official documentation](http://visionmedia.github.com/mocha/).

### Browser Demo

To be able to run default demo located in `demo/index.html` you first need to start **express** server by running:

    make serve

After that you can always get latest stitched version of your project on [localhost:4000/lib.js](http://localhost:4000/lib.js). If open demo page now you should see that *“The answer is 42”*.