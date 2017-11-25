const esprima = require('esprima');
const escodegen = require('escodegen');
const pathModule = require('path');
const instrumentAst = require('./instrumentAst');
const ignore = require('ignore')();
const pkgUp = require('pkg-up');
const fs = require('fs');
let ignoreDirectivesRelativeTo;

function addDefaultIgnores() {
    ignore.add([
        'node_modules/unexpected*',
        'node_modules/mocha',
        'node_modules/jest',
        'node_modules/jasmine',
        'node_modules/chance-generators',
        'test',
        '*.spec.js'
    ]);
}

if (process.env.DFL_IGNORE) {
    // Root-relative paths will be interpreted as absolute
    ignore.add(process.env.DFL_IGNORE);
} else {
    const closestPackageJson = pkgUp.sync();
    if (closestPackageJson) {
        try {
            const packageDirName = pathModule.dirname(closestPackageJson);
            const dflIgnorePath = pathModule.resolve(
                packageDirName,
                '.dflignore'
            );
            // Root-relative paths will be interpreted as relative
            // to the .dflignore file, as per the .gitignore convention:
            ignore.add(fs.readFileSync(dflIgnorePath, 'utf-8'));
            ignoreDirectivesRelativeTo = packageDirName;
        } catch (err) {
            addDefaultIgnores();
        }
    } else {
        addDefaultIgnores();
    }
}

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
require.extensions['.js'] = function (module, absoluteFileName) {
    let code;
    oldRequireHook(
        Object.create(module, {
            _compile: {
                value: _code => code = _code
            }
        }),
        absoluteFileName
    );
    let fileNameToCheck;
    if (ignoreDirectivesRelativeTo) {
        fileNameToCheck = pathModule.relative(ignoreDirectivesRelativeTo, absoluteFileName);
    } else {
        fileNameToCheck = absoluteFileName;
    }
    if (!ignore.ignores(fileNameToCheck)) {
        let ast = esprima.parseScript(code, { source: pathModule.resolve(absoluteFileName) });
        ast = instrumentAst(ast, getNextLocationNumber);
        code = escodegen.generate(ast);
    }
    module._compile(code, absoluteFileName);
};
