A shorthand for
[the "to be valid for all" assertion](../../function/to-be-valid-for-all/) for
simple cases where you have a test subject and a function that returns a
generator that "fuzzes", or somehow creates test cases, based on the subject.

```js
var g = require('chance-generators')(666);

function makePrefixGenerator(str) {
    return g.integer({min: 1, max: str.length - 1}).map(function (prefixLength) {
        return str.substr(0, prefixLength);
    });
}

expect('abc', 'when fuzzed by', makePrefixGenerator, 'to match', /^a/);
```

The above succeeds because the generated prefixes are at least one character
long, so every generated string will start with 'a'. If we change the minimum
prefix length to 0, we will see it generate the empty string fail:

```js
var g = require('chance-generators')(666);

function makePrefixGenerator(str) {
    return g.integer({min: 0, max: str.length - 1}).map(function (prefixLength) {
        return str.substr(0, prefixLength);
    });
}

expect('abc', 'when fuzzed by', makePrefixGenerator, 'to match', /^a/);
```

```output
expected 'abc' when fuzzed by
function makePrefixGenerator(str) {
  return g.integer({min: 0, max: str.length - 1}).map(function (prefixLength) {
    return str.substr(0, prefixLength);
  });
} to match /^a/
  Ran 2 iterations and found 1 errors
  counterexample:

    Generated input: ''

    expected 'abc' when fuzzed by
    function makePrefixGenerator(str) {
      return g.integer({min: 0, max: str.length - 1}).map(function (prefixLength) {
        return str.substr(0, prefixLength);
      });
    } to match /^a/
      expected '' to match /^a/
```
