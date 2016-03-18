An assertion that runs the subject function up to 100 times with different
generated input. If the subject function fails an error is thrown.

Let's tests that
[lodash.unescape](https://www.npmjs.com/package/lodash.unescape) reverses
[lodash.escape](https://www.npmjs.com/package/lodash.escape) we do that the
following way:

```js
var escape = require('lodash.escape');
var unescape = require('lodash.unescape');
var g = require('chance-generators')(666);

var strings = g.string({ length: g.natural({ max: 200 }) });
expect(function (text) {
  expect(unescape(escape(text)), 'to equal', text);
}, 'to be valid for all', strings);
```

This will run 300 tests with random strings of length 0-200 and succeed.

You can specify the max number of iterations that the test should run and the
number of errors it should collect before stopping.

The algorithm searches for the smallest error output, so the more errors you
allow it to collect the better the output will be. 

```js
expect(function (text) {
  expect(unescape(escape(text)), 'to equal', text);
}, 'to be valid for all', {
  generators: [strings],
  maxIterations: 1000,
  maxErrors: 30
});
```

I found to following code for
[Run-length encoding](https://en.wikipedia.org/wiki/Run-length_encoding) on the
[internet](http://rosettacode.org/wiki/Run-length_encoding#JavaScript), let's see
if that code also fulfill our round trip test:

```js
function rleEncode(input) {
  var encoding = [];
  input.match(/(.)\1*/g).forEach(function(substr){
    encoding.push([substr.length, substr[0]]);
  });
  return encoding;
}

function rleDecode(encoded) {
  var output = "";
  encoded.forEach(function(pair){
    output += new Array(1+pair[0]).join(pair[1]);
  });
  return output;
}

var g = require('chance-generators')(13);
var strings = g.string({ length: g.natural({ max: 200 }) });
expect(function (text) {
  expect(rleDecode(rleEncode(text)), 'to equal', text);
}, 'to be valid for all', strings);
```

```output
Ran 86 iterations and found 20 errors
counterexample:

  Generated input: ''

  Cannot read property 'forEach' of null
```

Something is failing for the empty string input. The problem is that the regular
expression in the encoder does not match the empty string. This would probably
also have been found in a unit test, but these edge cases are easily found using
property based testing. Imagine more complex scenarios where code only fails for
the null character, these cases might be harder to come up with while doing
normal unit testing.

You can supply as many generators as you want. My examples are using
[chance-generators](https://github.com/sunesimonsen/change-generators) but you
can using any function that produces a random output when called.

Here is a test that uses more than one generator:

```js
expect(function (a, b) {
  return (a + b).length === a.length + b.length;
}, 'to be valid for all', g.word, g.word);
```

Another example could be to generate actions. 

Let's create a simple queue:

```js
function Queue() {
  this.buffer = [];
}
Queue.prototype.enqueue = function (value) {
  this.buffer.push(value);
};
Queue.prototype.dequeue = function () {
  return this.buffer.shift(1);
};
Queue.prototype.isEmpty = function () {
  return this.buffer.length === 0;
};
Queue.prototype.drainTo = function (array) {
  while (!this.isEmpty()) {
    array.push(this.dequeue());
  }
};
```

Now let's test that items enqueued always comes out in the right order:

```js
var action = g.pick([
  { name: 'enqueue', value: g.string }, 
  { name: 'dequeue' }
]);

var actions = g.n(action, 200);

expect(function (actions) {
  var queue = new Queue();
  var enqueued = [];
  var dequeued = [];
  actions.forEach(function (action) {
    if (action.name === 'enqueue') {
      enqueued.push(action.value);
      queue.enqueue(action.value);
    } else if (!queue.isEmpty()) {
      dequeued.push(queue.dequeue());
    }
  });

  queue.drainTo(dequeued);

  expect(dequeued, 'to equal', enqueued);
}, 'to be valid for all', actions);
```
