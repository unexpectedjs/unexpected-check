A shorthand for
[the "to be valid for all" assertion](../../function/to-be-valid-for-all/) for
simple cases where you have a test subject and a function that returns a
generator that "fuzzes", or somehow creates test cases, based on the subject.

```js
const { integer } = require('chance-generators');

function makePrefixGenerator (str) {
  return integer({min: 1, max: str.length - 1}).map(prefixLength => (
    str.substr(0, prefixLength)
  ))
}

expect('abc', 'when fuzzed by', makePrefixGenerator, 'to match', /^a/);
```

The above succeeds because the generated prefixes are at least one character
long, so every generated string will start with 'a'. If we change the minimum
prefix length to 0, we will see it generate the empty string fail:

```js
function makePrefixGenerator(str) {
    return integer({ min: 0, max: str.length - 1 }).map(prefixLength => (
      str.substr(0, prefixLength)
    ))
}

expect('abc', 'when fuzzed by', makePrefixGenerator, 'to match', /^a/);
```

```output
Found an error after 4 iterations
counterexample:

  Generated input: ''
  with: fuzz({
    value: 'abc',
    mutator: integer({ min: 0, max: 2 }).map(function (prefixLength) {
      return str.substr(0, prefixLength);
    })
  })

  expected '' to match /^a/
```
