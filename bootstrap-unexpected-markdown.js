/*global unexpected:true, expect:true*///eslint-disable-line no-unused-vars
unexpected = require('unexpected').clone();
unexpected.output.preferredWidth = 80;
unexpected.use(require('./lib/unexpected-check'));

unexpected.addAssertion('<number> to be less than or equal to all <array>', function (expect, subject, array) {
    expect(array, 'to have items satisfying', expect.it('to be greater than or equal to', subject));
});

unexpected.addAssertion('<number> to be greater than or equal to all <array>', function (expect, subject, array) {
    expect(array, 'to have items satisfying', expect.it('to be less than or equal to', subject));
});

unexpected.addAssertion('<array> first item <assertion>', function (expect, subject) {
    return expect.shift(subject[0]);
});

unexpected.addAssertion('<array> last item <assertion>', function (expect, subject) {
    return expect.shift(subject[subject.length - 1]);
});

unexpected.addAssertion('<any> to be contained by <array>', function (expect, item, array) {
    expect(array.indexOf(item) !== -1, 'to be true');
});

expect = unexpected.clone();