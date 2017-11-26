/*global describe, it, beforeEach*/
const Generators = require('chance-generators');
const expect = require('unexpected');

const demo = require('../lib/demo');

expect.use(require('../lib/unexpected-check'));

const { natural, string } = new Generators(42);

describe('unexpected-check', () => {
    it('does not find the secret', () => {
        expect((text) => {
            demo(text);
        }, 'to be valid for all', string({ length: natural({ max: 50 }) }));
    });
});
