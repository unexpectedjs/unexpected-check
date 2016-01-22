/*global describe, it*/
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

var g = new Generators(42);

function sort(arr, cmp) {
    return [].concat(arr).sort(cmp);
}

var arrays = g.n(g.integer({ min: -20, max: 20 }), g.integer({ min: 1, max: 20 }));

describe('unexpected-check', function () {
    it('fails with an informative error message', function () {
        expect(function () {
            expect(function (arr) {
                var sorted = sort(arr);

                expect(sorted, 'to have length', arr.length)
                    .and('first item to be less than or equal to all', arr)
                    .and('last item to be greater than or equal to all', arr);
            }, 'to be valid for all', arrays);
        }, 'to throw',
               'Ran 44 iterations and found 20 errors\n' +
               'counterexample:\n' +
               '\n' +
               '  Generated input: [ 18, 4 ]\n' +
               '\n' +
               '  expected [ 18, 4 ] first item to be less than or equal to all [ 18, 4 ]\n' +
               '\n' +
               '  [\n' +
               '    18,\n' +
               '    4 // should be greater than or equal to 18\n' +
               '  ]');
    });

    it('find errors in the specification', function () {
        expect(function () {
            expect(function (arr) {
                expect(arr, 'not to contain', 2);
            }, 'to be valid for all', arrays);
        }, 'to throw',
               'Ran 25 iterations and found 20 errors\n' +
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
               'Ran 100 iterations and found 18 errors\n' +
               'counterexample:\n' +
               '\n' +
               '  Generated input: [ 3 ], 3\n' +
               '\n' +
               '  expected [ 3 ] not to contain 3\n' +
               '\n' +
               '  [\n' +
               '    3 // should be removed\n' +
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
               'Ran 100 iterations and found 17 errors\n' +
               'counterexample:\n' +
               '\n' +
               '  Generated input: [ -19, 1 ]\n' +
               '\n' +
               '  expected [ -19, 1 ]\n' +
               '  to have items satisfying function (item, i) { expect(item, \'not to be\', i); }\n' +
               '\n' +
               '  [\n' +
               '    -19,\n' +
               '    1 // should not be 1\n' +
               '  ]');
    });
});
