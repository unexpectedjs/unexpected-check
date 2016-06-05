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

If the generators you supply supports shrinking by providing a `shrink` function
on the generator function, unexpected-check will try to shrink the error space
as much as possible and therefore provide much more precise error cases.

I recommend using the plugin together with
[chance-generators](https://sunesimonsen.github.io/chance-generators/) as it
provides a huge range of generators and supports shrinking, but it is not a
requirement. You can use any function that produces a random output when called.

## Usage

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
expect.addAssertion('<array> to be sorted', function (expect, subject) {
  var isSorted = subject.every(function (x, i) {
    return subject.slice(i).every(function (y) {
      return x <= y;
    });
  });
  expect(isSorted, 'to be true');
});
```

Then we generate the input arrays:

```js
var g = require('chance-generators')(42);
// generate arrays of numbers from -20 to 20 with length varying from 1 to 20
var numbers = g.integer({ min: -20, max: 20 });
var lengths = g.integer({ min: 1, max: 20 });
var arrays = g.n(numbers, lengths);
```

Finally we make the assertion:

```js
expect(function (arr) {
  var sorted = sort(arr);
  expect(sorted, 'to have length', arr.length);
  expect(sorted, 'to be sorted');
}, 'to be valid for all', arrays);
```

But that assumption as actually not true as the build-in sort functions is based
on converting items to strings and comparing them. So you will get the following error:

```output
Ran 1000 iterations and found 14 errors
counterexample:

  Generated input: [ 2, 10 ]

  expected [ 10, 2 ] to be sorted
```

If we wanted to fix the problem, we would need to use a comparison function:

```js
function sortNumbers(arr) {
  return [].concat(arr).sort(function (a, b) {
    return a - b;
  });
}
```

```js
expect(function (arr) {
  var sorted = sortNumbers(arr);
  expect(sorted, 'to have length', arr.length);
  expect(sorted, 'to be sorted');
}, 'to be valid for all', arrays);
```

### Node

Install it with NPM or add it to your `package.json`:

```
$ npm install --save-dev unexpected unexpected-check
```

Then:

```js#evaluate:false
var expect = require('unexpected');
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
var expect = weknowhow.expect.clone();
expect.use(weknowhow.unexpectedCheck);
```

### RequireJS

Include the library with RequireJS the following way:

```js#evaluate:false
define(['unexpected', 'unexpected-check'], funtion (unexpected, unexpectedCheck) {
  var expect = unexpected.clone();
  expect.use(unexpectedCheck);
  // Your code
});
```

Notice that the [chance](www.chancejs.com) library some we configured with the
name `chance`.

## Asynchronous testing

Support for asynchronous testing by returning a promise from the subject
function:

```js#async:true
expect.use(require('unexpected-stream'));

return expect(function (text) {
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
}, 'to be valid for all', g.string);
```

## Options

* `generators` (default []): an array of generators used to generate the example
  data.
* `maxIterations` (default 300): the number of iterations that the subject
  function it ran when no errors occur.
* `maxErrorIterations` (default 1000): the number of iterations unexpected-check
  can use to find a better error when an error occurs.
* `maxErrors` (default 20): the number of found errors before stopping the input
  shrinking process.

```js
expect(function (arr) {
  var sorted = sort(arr);
  expect(sorted, 'to have length', arr.length);
  expect(sorted, 'to be sorted');
}, 'to be valid for all', {
    generators: [arrays],
    maxIterations: 100,
    maxErrorIterations: 100,
    maxErrors: 15
});
```

```output
Ran 100 iterations and found 4 errors
counterexample:

  Generated input: [ 0, -1, 4, 10 ]

  expected [ -1, 0, 10, 4 ] to be sorted
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
