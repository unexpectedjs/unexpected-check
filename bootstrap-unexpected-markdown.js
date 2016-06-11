/*global unexpected:true, expect:true*///eslint-disable-line no-unused-vars
unexpected = require('unexpected').clone();
unexpected.output.preferredWidth = 80;
unexpected.use(require('./lib/unexpected-check'));

expect = unexpected.clone();
