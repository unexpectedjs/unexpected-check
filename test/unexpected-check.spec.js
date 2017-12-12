/*global describe, it, beforeEach*/
var Generators = require('chance-generators');
var expect = require('unexpected');
expect.output.preferredWidth = 80;

var sinon = require('sinon');
expect.use(require('../lib/unexpected-check')).use(require('unexpected-sinon'));

expect.addAssertion('<array> to be sorted', function (expect, subject) {
    var isSorted = subject.every(function (x, i) {
        return subject.slice(i).every(function (y) {
            return x <= y;
        });
    });
    expect(isSorted, 'to be true');
});

expect.addAssertion('<any> to inspect as <string>', function (expect, subject, value) {
    expect(expect.inspect(subject).toString(), 'to equal', value);
});

function sort(arr, cmp) {
    return [].concat(arr).sort(cmp);
}

describe('unexpected-check', function () {
    var g;
    var arrays;
    beforeEach(function () {
        g = new Generators(666);
        arrays = g.n(g.integer({ min: -20, max: 20 }), g.integer({ min: 1, max: 20 }));
    });

    it('fails with an informative error message', function () {
        expect(function () {
            expect(function (arr) {
                var sorted = sort(arr);

                expect(sorted, 'to have length', arr.length)
                  .and('to be sorted');
            }, 'to be valid for all', {
                generators: [arrays],
                maxIterations: 50,
                maxErrorIterations: 130,
                maxErrors: 15
            });
        }, 'to throw',
               'Ran 131 iterations and found 12 errors\n' +
               'counterexample:\n' +
               '\n' +
               '  Generated input: [ -1, -2 ]\n' +
               '  with: n(integer({ min: -20, max: 20 }), integer({ min: 1, max: 20 }))\n' +
               '\n' +
               '  expected [ -1, -2 ] to be sorted');
    });

    it('find errors in the specification', function () {
        expect(function () {
            expect(function (arr) {
                expect(arr, 'not to contain', 2);
            }, 'to be valid for all', arrays);
        }, 'to throw',
               'Ran 174 iterations and found 50 errors\n' +
               'counterexample:\n' +
               '\n' +
               '  Generated input: [ 2 ]\n' +
               '  with: n(integer({ min: -20, max: 20 }), integer({ min: 1, max: 20 }))\n' +
               '\n' +
               '  expected [ 2 ] not to contain 2\n' +
               '\n' +
               '  [\n' +
               '    2 // should be removed\n' +
               '  ]');
    });

    it('succeeds for a valid requirement', function () {
        expect(function (arr) {
            var sorted = sort(arr, function (a, b) { return a - b; });

            expect(sorted, 'to have length', arr.length)
              .and('to be sorted');
        }, 'to be valid for all', arrays);
    });

    it('produces minimal output with dependencies between the generated value', function () {
        expect(function () {
            expect(function (items, i) {
                expect(items, 'not to contain', i);
            }, 'to be valid for all', arrays, g.integer({ min: -20, max: 20 }));
        }, 'to throw',
               'Ran 8 iterations and found 7 errors\n' +
               'counterexample:\n' +
               '\n' +
               '  Generated input: [ 0 ], 0\n' +
               '  with: n(integer({ min: -20, max: 20 }), integer({ min: 1, max: 20 })), integer({ min: -20, max: 20 })\n' +
               '\n' +
               '  expected [ 0 ] not to contain 0\n' +
               '\n' +
               '  [\n' +
               '    0 // should be removed\n' +
               '  ]');
    });

    it('finds needle in a haystack errors', function () {
        expect(function () {
            expect(function (items) {
                expect(items, 'to have items satisfying', function (item, i) {
                    expect(item, 'not to be', i);
                });
            }, 'to be valid for all', arrays);
        }, 'to throw',
               'Ran 20 iterations and found 7 errors\n' +
               'counterexample:\n' +
               '\n' +
               '  Generated input: [ 0 ]\n' +
               '  with: n(integer({ min: -20, max: 20 }), integer({ min: 1, max: 20 }))\n' +
               '\n' +
               '  expected [ 0 ]\n' +
               '  to have items satisfying function (item, i) { expect(item, \'not to be\', i); }\n' +
               '\n' +
               '  [\n' +
               '    0 // should not be 0\n' +
               '  ]');
    });

    it('finds invalid strings', function () {
        var arrays = g.n(g.string, g.integer({ min: 1, max: 20 }));

        expect(function () {
            expect(function (items) {
                expect(items, 'to have items satisfying', function (item) {
                    expect(item, 'not to match', /[!@#$%^&*()_+]/);
                });
            }, 'to be valid for all', arrays);
        }, 'to throw',
               'Ran 60 iterations and found 50 errors\n' +
               'counterexample:\n' +
               '\n' +
               '  Generated input: [ \'!\' ]\n' +
               '  with: n(string, integer({ min: 1, max: 20 }))\n' +
               '\n' +
               '  expected [ \'!\' ] to have items satisfying\n' +
               '  function (item) {\n' +
               '    expect(item, \'not to match\', /[!@#$%^&*()_+]/);\n' +
               '  }\n' +
               '\n' +
               '  [\n' +
               '    \'!\' // should not match /[!@#$%^&*()_+]/\n' +
               '        //\n' +
               '        // !\n' +
               '        // ^\n' +
               '  ]');
    });

    it('supports asynchronous bodies', function () {
        return expect(
            expect(function (items, i) {
                return expect.promise(function () {
                    expect(items, 'not to contain', i);
                }).delay(1);
            }, 'to be valid for all', arrays, g.integer({ min: -20, max: 20 }))
        , 'to be rejected with',
            'Ran 8 iterations and found 7 errors\n' +
            'counterexample:\n' +
            '\n' +
            '  Generated input: [ 0 ], 0\n' +
            '  with: n(integer({ min: -20, max: 20 }), integer({ min: 1, max: 20 })), integer({ min: -20, max: 20 })\n' +
            '\n' +
            '  expected [ 0 ] not to contain 0\n' +
            '\n' +
            '  [\n' +
            '    0 // should be removed\n' +
            '  ]');
    });

    it('supports a mix between synchronous and asynchronous bodies', function () {
        return expect(function () {
            return expect(function (items, i) {
                if (i % 2 === 0) {
                    expect(items, 'not to contain', i);
                } else {
                    return expect.promise(function () {
                        expect(items, 'not to contain', i);
                    }).delay(1);
                }
            }, 'to be valid for all', arrays, g.integer({ min: -20, max: 20 }));
        }, 'to error',
            'Ran 8 iterations and found 7 errors\n' +
            'counterexample:\n' +
            '\n' +
            '  Generated input: [ 0 ], 0\n' +
            '  with: n(integer({ min: -20, max: 20 }), integer({ min: 1, max: 20 })), integer({ min: -20, max: 20 })\n' +
            '\n' +
            '  expected [ 0 ] not to contain 0\n' +
            '\n' +
            '  [\n' +
            '    0 // should be removed\n' +
            '  ]');
    });

    it('inspects mapped generators correctly', function () {
        expect(
            arrays.map(function (value) {
                return 'number: ' + value;
            }),
            'to inspect as',
            'n(integer({ min: -20, max: 20 }), integer({ min: 1, max: 20 })).map(function (value) { return \'number: \' + value; })'
        );
    });

    describe('when fuzzed by assertion', function () {
        it('should use the supplied function to make a generator from the subject and use the generator to make test cases', function () {
            var fuzzer;

            var prefixGenerator = sinon.spy(function prefixGenerator(str) {
                fuzzer = sinon.spy(g.integer({min: 1, max: str.length - 1}).map(function (prefixLength) {
                    return str.substr(0, prefixLength);
                }));
                return fuzzer;
            });

            return expect('abcdef', 'when fuzzed by', prefixGenerator, 'to be a string').then(function () {
                expect(prefixGenerator, 'was called once');
                expect(fuzzer, 'was called times', 300);
            });
        });

        it('should error out with a counterexample', function () {
            return expect(function () {
                return expect('abcdef', 'when fuzzed by', function prefixGenerator(str) {
                    return g.integer({min: 1, max: str.length - 1}).map(function (prefixLength) {
                        return str.substr(0, prefixLength);
                    });
                }, 'to have length', 5);
            }, 'to error with',
                "Ran 2 iterations and found 2 errors\n" +
                "counterexample:\n" +
                "\n" +
                "  Generated input: 'a'\n" +
                "  with: fuzz('abcdef', function prefixGenerator(str) {\n" +
                "    return g.integer({min: 1, max: str.length - 1}).map(function (prefixLength) {\n" +
                "      return str.substr(0, prefixLength);\n" +
                "    });\n" +
                "  })\n" +
                "\n" +
                "  expected 'a' to have length 5\n" +
                "    expected 1 to be 5"
            );
        });
    });
});
