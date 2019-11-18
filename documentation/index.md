---
template: default.ejs
theme: dark
title: unexpected-check
repository: https://github.com/unexpectedjs/unexpected-check
---

# unexpected-check
# property based testing plugin for unexpected

<img alt="Checkmate!" src="./unexpected-check.jpg" style="display: block; max-width: 100%">

[![NPM version](https://badge.fury.io/js/unexpected-check.svg)](http://badge.fury.io/js/unexpected-check)
[![Build Status](https://travis-ci.org/unexpectedjs/unexpected-check.svg?branch=master)](https://travis-ci.org/unexpectedjs/unexpected-check)
[![Dependency Status](https://david-dm.org/unexpectedjs/unexpected-check.svg)](https://david-dm.org/unexpectedjs/unexpected-check)

This plugin tries to bring generative testing (aka property testing) to the
[unexpected](http://unexpected.js.org) assertion library. The idea is that it
should be possible to mix property based testing and normal unit-tests using the
same tool chain.

This plugin is build to work together with
[chance-generators](https://sunesimonsen.github.io/chance-generators/) which
provides a huge range of composable generators that supports
[shrinking](https://sunesimonsen.github.io/chance-generators/api/iterator/#shrink-value-).

If the generators you supply supports
[shrinking](https://sunesimonsen.github.io/chance-generators/api/iterator/#shrink-value-),
then unexpected-check will try to shrink the error space as much as possible and
therefore provide much more precise error cases.

## Usage


Install it with NPM or add it to your `package.json`:

```
$ npm install --save-dev unexpected unexpected-check chance-generators
```

Then register the plugin:

```js#evaluate:false
const expect = require('unexpected');
expect.use(require('unexpected-check');
```

Let's imagine we wanted to sort arrays of numbers using this function:

```js
function sort(arr) {
  return [].concat(arr).sort();
}
```

Then we could write a test to ensure the following:

* the resulting array has the same size as the input array.
* the resulting array is sorted.

First we will create an assertion for checking that an array is sorted:

```js
expect.addAssertion('<array> to be sorted', (expect, subject) => {
  const isSorted = subject.every((x, i) => (
    subject.slice(i).every(y => x <= y)
  ));

  expect(isSorted, 'to be true');
});
```

Then we generate the input arrays:

```js
const { array, integer } = require('chance-generators');

// generate arrays of numbers from -20 to 20 with length varying from 1 to 20
const numbers = array(integer({ min: -20, max: 20 }), { min: 1, max: 20 });
```

Finally we make the assertion:

```js
expect((arr) => {
  const sorted = sort(arr);
  expect(sorted, 'to have length', arr.length);
  expect(sorted, 'to be sorted');
}, 'to be valid for all', numbers);
```

But that assumption is actually not true as the build-in sort functions is based
on converting items to strings and comparing them. So you will get the following error:

```output
Found an error after 1 iteration, 107 additional errors found.
counterexample:

  Generated input: [ -2, -1 ]
  with: array({ itemGenerator: integer({ min: -20, max: 20 }), min: 1, max: 20 })

  expected [ -1, -2 ] to be sorted
```

If we wanted to fix the problem, we would need to use a comparison function:

```js
function sortNumbers(arr) {
  return [].concat(arr).sort((a, b) => a - b);
}
```

```js
expect((arr) => {
  const sorted = sortNumbers(arr);
  expect(sorted, 'to have length', arr.length);
  expect(sorted, 'to be sorted');
}, 'to be valid for all', numbers);
```

## Install

### Node

Install it with NPM or add it to your `package.json`:

```
$ npm install --save-dev unexpected unexpected-check chance-generators
```

Then:

```js#evaluate:false
const expect = require('unexpected');
expect.use(require('unexpected-check');
```

### Browser

Include the `unexpected-check.js` found at the lib directory of this
repository.

```html
<script src="unexpected.js"></script>
<script src="unexpected-check.js"></script>
```

this will expose the expect function under the following namespace:

```js#evaluate:false
const expect = weknowhow.expect.clone();
expect.use(weknowhow.unexpectedCheck);
```

### RequireJS

Include the library with RequireJS the following way:

```js#evaluate:false
define(['unexpected', 'unexpected-check'], function (unexpected, unexpectedCheck) {
  const expect = unexpected.clone();
  expect.use(unexpectedCheck);
  // Your code
});
```

## Asynchronous testing

Support for asynchronous testing by returning a promise from the subject
function:

```js#async:true
const { string } = require('chance-generators');
expect.use(require('unexpected-stream'));

return expect(text => {
  return expect(
    text,
    'when piped through',
    [
      require('zlib').Gzip(),
      require('zlib').Gunzip()
    ],
    'to yield output satisfying',
    'when decoded as', 'utf-8',
    'to equal',
    text
  );
}, 'to be valid for all', string);
```

## Options

* `generators` (default []): an array of generators used to generate the example
  data.
* `maxIterations` (default 300): the number of iterations that the subject
  function it ran when no errors occur. You can control the default for this
  option by setting the environment variable `UNEXPECTED_CHECK_MAX_ITERATIONS`
  or setting the query parameter `maxiterations` in the browser.
* `maxErrorIterations` (default 1000): the number of iterations unexpected-check
  can use to find a better error when an error occurs.
* `maxErrors` (default 201): the number of found errors before stopping the input
  shrinking process.

```js
expect((arr) => {
  const sorted = sort(arr);
  expect(sorted, 'to have length', arr.length);
  expect(sorted, 'to be sorted');
}, 'to be valid for all', {
    generators: [numbers],
    maxIterations: 100,
    maxErrorIterations: 100,
    maxErrors: 10
});
```

```output
Found an error after 1 iteration, 9 additional errors found.
counterexample:

  Generated input: [ 0, 0, -2, -1 ]
  with: array({ itemGenerator: integer({ min: -20, max: 20 }), min: 1, max: 20 })

  expected [ -1, -2, 0, 0 ] to be sorted
```

As you can see the input shrinking is worse with less iterations, but it will be
a bit faster.

## Source

The source for this plugin can be found on
[Github](https://github.com/unexpectedjs/unexpected-check).

## MIT License

Copyright (c) 2016 Sune Simonsen <sune@we-knowhow.dk>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
