---
template: default.ejs
theme: dark
title: unexpected-check
repository: https://github.com/unexpectedjs/unexpected-check
---

# unexpected-check
# property based testing plugin for unexpected

<img alt="Checkmate!" src="./unexpected-check.jpg" style="display: block; max-width: 100%">

This plugin tries to bring generative testing (aka property testing) to the
[unexpected](http://unexpected.js.org) assertion library. The idea is that it
should be possible to mix property based testing and normal unit-tests using the
same tool chain.

If the generators you supply supports shrinking by providing a `shrink` function
on the generator function, unexpected-check will try to shrink the error space
as much as possible and therefore provide much more precise error cases.

This project is still in it early days and asynchronous testing are missing. It
is currently not possible to configure the number of iterations the tests should
be executed either.

I recommend using the plugin together with
[chance-generators](https://github.com/sunesimonsen/change-generators) as it
provides a huge range of generators and supports shrinking, but it is not a
requirement. You can uses any function that produces a random output when called
as generators.

## Usage

Let's imagine we wanted to sort arrays of numbers using this function:

```js
function sort(arr) {
  return [].concat(arr).sort();
}
```

Then we could write a test to ensure the following:

* that the resulting array has the same size as the input array.
* that the first item in the sorted array is less than or equal to all items in the input array.
* that the last item in the sorted array is greater than or equal to all items in the input array.

We do that the following way:

```js
var g = require('chance-generators')(42);
var arrays = g.n(g.integer({ min: -20, max: 20 }), g.integer({ min: 1, max: 20 }));

expect(function (arr) {
  var sorted = sort(arr);

  expect(sorted, 'to have length', arr.length)
    .and('first item to be less than or equal to all', arr)
    .and('last item to be greater than or equal to all', arr);
}, 'to be valid for all', arrays);
```

But that assumption as actually not true as the build in sort functions is based
on converting items to strings and comparing them. So you will get the following error:

```output
Ran 44 iterations and found 20 errors
counterexample:

  Generated input: [ 18, 4 ]

  expected [ 18, 4 ] first item to be less than or equal to all [ 18, 4 ]

  [
    18,
    4 // should be greater than or equal to 18
  ]
```

If we wanted to fix the problem, we would need to use a comparison function:

```js
function sort(arr) {
  return [].concat(arr).sort(function (a, b) {
    return a - b;
  });
}
```

```js
expect(function (arr) {
  var sorted = sort(arr);

  expect(sorted, 'to have length', arr.length)
    .and('first item to be less than or equal to all', arr)
    .and('last item to be greater than or equal to all', arr);
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
