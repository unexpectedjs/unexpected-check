/*global describe, it*/
describe('unexpected-check', function () {
    
    expect(function (a, b) {
    }, 'to be valid for all', gen.number, gen.number);
});
