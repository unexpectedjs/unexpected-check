/*global describe, it, beforeEach*/
var Generators = require('chance-generators');
var expect = require('unexpected');
expect.output.preferredWidth = 80;

expect.use(require('../lib/unexpected-check'));

expect.addAssertion('<number> to be less than or equal to all <array>', function (expect, subject, array) {
    expect(array, 'to have items satisfying', expect.it('to be greater than or equal to', subject));
});

expect.addAssertion('<number> to be greater than or equal to all <array>', function (expect, subject, array) {
    expect(array, 'to have items satisfying', expect.it('to be less than or equal to', subject));
});

expect.addAssertion('<array> first item <assertion>', function (expect, subject) {
    return expect.shift(subject[0]);
});

expect.addAssertion('<array> last item <assertion>', function (expect, subject) {
    return expect.shift(subject[subject.length - 1]);
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
                    .and('first item to be less than or equal to all', arr)
                    .and('last item to be greater than or equal to all', arr);
            }, 'to be valid for all', {
                generators: [arrays],
                maxIterations: 20,
                maxErrors: 20
            });
        }, 'to throw',
               'Ran 20 iterations and found 11 errors\n' +
               'counterexample:\n' +
               '\n' +
               '  Generated input: [ -3, -2 ]\n' +
               '\n' +
               '  expected [ -2, -3 ] first item to be less than or equal to all [ -3, -2 ]\n' +
               '\n' +
               '  [\n' +
               '    -3, // should be greater than or equal to -2\n' +
               '    -2\n' +
               '  ]');
    });

    it('find errors in the specification', function () {
        expect(function () {
            expect(function (arr) {
                expect(arr, 'not to contain', 2);
            }, 'to be valid for all', arrays);
        }, 'to throw',
               'Ran 24 iterations and found 10 errors\n' +
               'counterexample:\n' +
               '\n' +
               '  Generated input: [ 2 ]\n' +
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
                .and('first item to be less than or equal to all', arr)
                .and('last item to be greater than or equal to all', arr);
        }, 'to be valid for all', arrays);
    });

    it('produces minimal output with dependencies between the generated value', function () {
        expect(function () {
            expect(function (items, i) {
                expect(items, 'not to contain', i);
            }, 'to be valid for all', arrays, g.integer({ min: -20, max: 20 }));
        }, 'to throw',
               'Ran 9 iterations and found 7 errors\n' +
               'counterexample:\n' +
               '\n' +
               '  Generated input: [ 0 ], 0\n' +
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
               'Ran 107 iterations and found 20 errors\n' +
               'counterexample:\n' +
               '\n' +
               '  Generated input: [ -3, 1 ]\n' +
               '\n' +
               '  expected [ -3, 1 ]\n' +
               '  to have items satisfying function (item, i) { expect(item, \'not to be\', i); }\n' +
               '\n' +
               '  [\n' +
               '    -3,\n' +
               '    1 // should not be 1\n' +
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
               'Ran 5 iterations and found 4 errors\n' +
               'counterexample:\n' +
               '\n' +
               '  Generated input: [ \'(\' ]\n' +
               '\n' +
               '  expected [ \'(\' ] to have items satisfying\n' +
               '  function (item) {\n' +
               '    expect(item, \'not to match\', /[!@#$%^&*()_+]/);\n' +
               '  }\n' +
               '\n' +
               '  [\n' +
               '    \'(\' // should not match /[!@#$%^&*()_+]/\n' +
               '        //\n' +
               '        // (\n' +
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
            'Ran 9 iterations and found 7 errors\n' +
            'counterexample:\n' +
            '\n' +
            '  Generated input: [ 0 ], 0\n' +
            '\n' +
            '  expected [ 0 ] not to contain 0\n' +
            '\n' +
            '  [\n' +
            '    0 // should be removed\n' +
            '  ]');
    });

    it('supports a mix between synchronous and asynchronous bodies', function () {
        return expect(
            expect(function (items, i) {
                if (i % 2 === 0) {
                    expect(items, 'not to contain', i);
                } else {
                    return expect.promise(function () {
                        expect(items, 'not to contain', i);
                    }).delay(1);
                }
            }, 'to be valid for all', arrays, g.integer({ min: -20, max: 20 }))
        , 'to be rejected with',
            'Ran 9 iterations and found 7 errors\n' +
            'counterexample:\n' +
            '\n' +
            '  Generated input: [ 0 ], 0\n' +
            '\n' +
            '  expected [ 0 ] not to contain 0\n' +
            '\n' +
            '  [\n' +
            '    0 // should be removed\n' +
            '  ]');
    });
});
