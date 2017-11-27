/*global describe, it, beforeEach*/
const Generators = require('chance-generators');
const expect = require('unexpected');

const demo = require('../lib/demo');

expect.use(require('../lib/unexpected-check'));

const { natural, string } = new Generators(42);

describe('unexpected-check', () => {
    it('does not find the secret', () => {
        expect((text) => {
            demo.findTheSecret(text);
        }, 'to be valid for all', string({ length: natural({ max: 50 }) }));
    });

    it('does not find the hardest secret', () => {
        expect((text) => {
            demo.findTheHardestSecret(text);
        }, 'to be valid for all', string({ length: natural({ max: 50 }) }));
    });

    it('does not find magic numbers', () => {
        const numbers = natural({ max: 200 });

        expect((a, b, c) => {
            demo.findTheMagicNumbers(a, b, c);
        }, 'to be valid for all', numbers, numbers, numbers);
    });
});
