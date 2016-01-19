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
               'Ran 23 iterations and found 20 errors\n' +
               'counterexample:\n' +
               '\n' +
               '  Generated input: [ -19, -2, -16 ]\n' +
               '\n' +
               '  expected [ -16, -19, -2 ]\n' +
               '  first item to be less than or equal to all [ -19, -2, -16 ]\n' +
               '\n' +
               '  [\n' +
               '    -19, // should be greater than or equal to -16\n' +
               '    -2,\n' +
               '    -16\n' +
               '  ]');
    });

    it('find errors in the specification', function () {
        expect(function () {
            expect(function (arr) {
                expect(arr, 'not to contain', 2);
            }, 'to be valid for all', arrays);
        }, 'to throw',
               'Ran 52 iterations and found 20 errors\n' +
               'counterexample:\n' +
               '\n' +
               '  Generated input: [ 2, -17, 9, -13, 7 ]\n' +
               '\n' +
               '  expected [ 2, -17, 9, -13, 7 ] not to contain 2\n' +
               '\n' +
               '  [\n' +
               '    2, // should be removed\n' +
               '    -17,\n' +
               '    9,\n' +
               '    -13,\n' +
               '    7\n' +
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
               'Ran 96 iterations and found 20 errors\n' +
               'counterexample:\n' +
               '\n' +
               '  Generated input: [ -7 ], -7\n' +
               '\n' +
               '  expected [ -7 ] not to contain -7\n' +
               '\n' +
               '  [\n' +
               '    -7 // should be removed\n' +
               '  ]');
    });
});
