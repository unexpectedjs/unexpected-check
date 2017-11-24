const esprima = require('esprima');
const escodegen = require('escodegen');
const pathModule = require('path');
const instrumentAst = require('./instrumentAst');

let locations;
let prevLocation;

function initialize() {
    global.recordLocation.locations = locations = {};
    prevLocation = 0;
}

global.recordLocation = (location) => {
    const key = location ^ prevLocation;
    locations[key] = (locations[key] || 0) + 1;
    prevLocation = location >> 1;
};

initialize();

global.recordLocation.reset = initialize;

var nextLocationNumber = 1;
function getNextLocationNumber() {
    return nextLocationNumber++;
}

const oldRequireHook = require.extensions['.js'];
require.extensions['.js'] = function (module, fileName) {
    let code;
    oldRequireHook(
        Object.create(module, {
            _compile: {
                value: _code => code = _code
            }
        }),
        fileName
    );
    let ast = esprima.parseScript(code, { source: pathModule.resolve(fileName) });

    ast = instrumentAst(ast, getNextLocationNumber);
    module._compile(escodegen.generate(ast), fileName);
};
