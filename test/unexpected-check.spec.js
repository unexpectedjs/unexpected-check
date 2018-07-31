/*global describe, it, beforeEach*/
var { array, integer, string } = require('chance-generators');
var expect = require('unexpected');
expect.output.preferredWidth = 80;

expect.use(require('../lib/unexpected-check'));

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
    var numbers;

    beforeEach(function () {
        numbers = array(integer({ min: -20, max: 20 }), { min: 1, max: 20 });
    });

    it('fails with an informative error message', function () {
        expect(function () {
            expect(function (arr) {
                var sorted = sort(arr);

                expect(sorted, 'to have length', arr.length)
                  .and('to be sorted');
            }, 'to be valid for all', {
                generators: [numbers],
                maxIterations: 50,
                maxErrorIterations: 200,
                maxErrors: 30
            });
        }, 'to throw',
               'Found an error after 1 iteration, 25 additional errors found.\n' +
               'counterexample:\n' +
               '\n' +
               '  Generated input: [ -1, -2 ]\n' +
               '  with: array({ itemGenerator: integer({ min: -20, max: 20 }), min: 1, max: 20 })\n' +
               '\n' +
               '  expected [ -1, -2 ] to be sorted');
    });

    it('find errors in the specification', function () {
        expect(function () {
            expect(function (arr) {
                expect(arr, 'not to contain', 2);
            }, 'to be valid for all', numbers);
        }, 'to throw',
               'Found an error after 3 iterations, 200 additional errors found.\n' +
               'counterexample:\n' +
               '\n' +
               '  Generated input: [ 2 ]\n' +
               '  with: array({ itemGenerator: integer({ min: -20, max: 20 }), min: 1, max: 20 })\n' +
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
        }, 'to be valid for all', numbers);
    });

    it('produces minimal output with dependencies between the generated value', function () {
        expect(function () {
            expect(function (items, i) {
                expect(items, 'not to contain', i);
            }, 'to be valid for all', numbers, integer({ min: -20, max: 20 }));
        }, 'to throw',
               'Found an error after 1 iteration, 6 additional errors found.\n' +
               'counterexample:\n' +
               '\n' +
               '  Generated input: [ 0 ], 0\n' +
               '  with: array({ itemGenerator: integer({ min: -20, max: 20 }), min: 1, max: 20 }), integer({ min: -20, max: 20 })\n' +
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
            }, 'to be valid for all', numbers);
        }, 'to throw',
               'Found an error after 3 iterations, 12 additional errors found.\n' +
               'counterexample:\n' +
               '\n' +
               '  Generated input: [ 0 ]\n' +
               '  with: array({ itemGenerator: integer({ min: -20, max: 20 }), min: 1, max: 20 })\n' +
               '\n' +
               '  expected [ 0 ]\n' +
               '  to have items satisfying function (item, i) { expect(item, \'not to be\', i); }\n' +
               '\n' +
               '  [\n' +
               '    0 // should not be 0\n' +
               '  ]');
    });

    it('finds invalid strings', function () {
        var strings = array(string, { min: 1, max: 20 });

        expect(function () {
            expect(function (items) {
                expect(items, 'to have items satisfying', function (item) {
                    expect(item, 'not to match', /[!@#$%^&*()_+]/);
                });
            }, 'to be valid for all', strings);
        }, 'to throw',
               'Found an error after 1 iteration, 200 additional errors found.\n' +
               'counterexample:\n' +
               '\n' +
               '  Generated input: [ \'#\' ]\n' +
               '  with: array({ itemGenerator: string, min: 1, max: 20 })\n' +
               '\n' +
               '  expected [ \'#\' ] to have items satisfying\n' +
               '  function (item) {\n' +
               '    expect(item, \'not to match\', /[!@#$%^&*()_+]/);\n' +
               '  }\n' +
               '\n' +
               '  [\n' +
               '    \'#\' // should not match /[!@#$%^&*()_+]/\n' +
               '        //\n' +
               '        // #\n' +
               '        // ^\n' +
               '  ]');
    });

    it('supports asynchronous bodies', function () {
        return expect(
            expect(function (items, i) {
                return expect.promise(function () {
                    expect(items, 'not to contain', i);
                }).delay(1);
            }, 'to be valid for all', numbers, integer({ min: -20, max: 20 }))
        , 'to be rejected with',
            'Found an error after 6 iterations, 14 additional errors found.\n' +
            'counterexample:\n' +
            '\n' +
            '  Generated input: [ 0 ], 0\n' +
            '  with: array({ itemGenerator: integer({ min: -20, max: 20 }), min: 1, max: 20 }), integer({ min: -20, max: 20 })\n' +
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
            }, 'to be valid for all', numbers, integer({ min: -20, max: 20 }));
        }, 'to error',
            'Found an error after 2 iterations, 12 additional errors found.\n' +
            'counterexample:\n' +
            '\n' +
            '  Generated input: [ 0 ], 0\n' +
            '  with: array({ itemGenerator: integer({ min: -20, max: 20 }), min: 1, max: 20 }), integer({ min: -20, max: 20 })\n' +
            '\n' +
            '  expected [ 0 ] not to contain 0\n' +
            '\n' +
            '  [\n' +
            '    0 // should be removed\n' +
            '  ]');
    });

    it('does not accept legacy generators', () => {
        var legacyGenerator = function () {
            return Math.random();
        };

        legacyGenerator.isGenerator = true;

        return expect(function () {
            return expect(function (items, i) {
                if (i % 2 === 0) {
                    expect(items, 'not to contain', i);
                } else {
                    return expect.promise(function () {
                        expect(items, 'not to contain', i);
                    }).delay(1);
                }
            }, 'to be valid for all', legacyGenerator);
        }, 'to throw',
            'Generators needs to have a values method that returns an iterator\n' +
            'See: https://sunesimonsen.github.io/chance-generators/api/generator/');
    });

    it('inspects mapped generators correctly', function () {
        expect(
            numbers.map(function (value) {
                return 'number: ' + value;
            }),
            'to inspect as',
            'array({ itemGenerator: integer({ min: -20, max: 20 }), min: 1, max: 20 }).map(function (value) { return \'number: \' + value; })'
        );
    });

    describe('when fuzzed by assertion', function () {
        it('should error out with a counterexample', function () {
            return expect(function () {
                return expect('abcdef', 'when fuzzed by', function prefixGenerator(str) {
                    return integer({min: 1, max: str.length - 1}).map(function (prefixLength) {
                        return str.substr(0, prefixLength);
                    });
                }, 'to have length', 5);
            }, 'to error with',
                'Found an error after 4 iterations, 1 additional error found.\n' +
                'counterexample:\n' +
                '\n' +
                '  Generated input: \'a\'\n' +
                '  with: fuzz({\n' +
                '    value: \'abcdef\',\n' +
                '    mutator: integer({ min: 1, max: 5 }).map(function (prefixLength) {\n' +
                '      return str.substr(0, prefixLength);\n' +
                '    })\n' +
                '  })\n' +
                '\n' +
                '  expected \'a\' to have length 5\n' +
                '    expected 1 to be 5');
        });
    });
});
