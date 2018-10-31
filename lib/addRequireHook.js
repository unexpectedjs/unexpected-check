const esprima = require('esprima');
const escodegen = require('escodegen');
const pathModule = require('path');
const instrumentAst = require('./instrumentAst');
const createIgnore = require('ignore');
const deepIgnore = createIgnore();
const shallowIgnore = createIgnore();
const pkgUp = require('pkg-up');
const fs = require('fs');
let ignoreDirectivesRelativeTo;

function addDefaultIgnores() {
  deepIgnore.add([
    'node_modules/unexpected*',
    'node_modules/array-changes',
    'node_modules/arraydiff-papandreou',
    'node_modules/array-changes-async',
    'node_modules/arraydiff-async',
    'node_modules/greedy-interval-packer',
    'node_modules/magicpen',
    'node_modules/mocha',
    'node_modules/jest',
    'node_modules/jasmine',
    'node_modules/chance',
    'node_modules/chance-generators',
    'node_modules/sinon'
  ]);
  shallowIgnore.add([
    'test',
    '*.spec.js',
    '../../unexpected-check/lib/unexpected-check.js'
  ]);
}

if (process.env.DFL_IGNORE) {
  // Root-relative paths will be interpreted as absolute
  shallowIgnore.add(process.env.DFL_IGNORE);
} else {
  const closestPackageJson = pkgUp.sync();
  if (closestPackageJson) {
    try {
      const packageDirName = pathModule.dirname(closestPackageJson);
      ignoreDirectivesRelativeTo = packageDirName;

      const dflIgnorePath = pathModule.resolve(packageDirName, '.dflignore');
      // Root-relative paths will be interpreted as relative
      // to the .dflignore file, as per the .gitignore convention:
      shallowIgnore.add(fs.readFileSync(dflIgnorePath, 'utf-8'));
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
  global.recordLocation.locations = locations = Object.create(null);
  global.recordProximity.proximity = Object.create(null);
  prevLocation = 0;
}

global.recordLocation = location => {
  const key = location ^ prevLocation;
  locations[key] = (locations[key] || 0) + 1;
  prevLocation = location >> 1;
};

function evaluate(left, operator, right) {
  switch (operator) {
    case '===':
      return left === right;
    case '!==':
      return left !== right;
    case '<':
      return left < right;
    case '>':
      return left > right;
    case '<=':
      return left <= right;
    case '>=':
      return left >= right;
    case '==':
      return left == right; // eslint-disable-line eqeqeq
  }
}

function calculateNumberProximity(left, operator, right) {
  var difference = Math.abs(left - right);
  if (difference > 1000) {
    return null;
  }

  switch (operator) {
    case '!==':
      return Number.isInteger(left) && Number.isInteger(right) ? 1 : null;
    case '===':
    case '==':
      return Number.isInteger(left) && Number.isInteger(right)
        ? difference
        : null;
    case '<':
    case '>':
      return difference;
    case '<=':
    case '>=':
      return difference + 1;
    default:
      return null;
  }
}

function calculateStringProximity(left, operator, right) {
  switch (operator) {
    case '!==':
      return 1;
    case '===':
    case '==':
      const lengthDifference = Math.abs(left.length - right.length);
      const limit = 30;

      let difference = lengthDifference;
      if (difference >= limit) {
        for (var i = 0; i < Math.min(left.length, right.length); i += 1) {
          if (left[i] !== right[i]) {
            difference++;
          }
        }
      }

      return difference > limit ? null : difference;
    default:
      return null;
  }
}

global.recordProximity = (left, operator, right) => {
  let result = evaluate(left, operator, right);
  const leftType = typeof left;
  const rightType = typeof right;

  let proximity = null;

  if (!result) {
    if (leftType === 'number' && rightType === 'number') {
      proximity = calculateNumberProximity(left, operator, right);
    } else if (leftType === 'string' && rightType === 'string') {
      proximity = calculateStringProximity(left, operator, right);
    }
  }

  if (proximity !== null && proximity > 0) {
    global.recordProximity.proximity[proximity] =
      (global.recordProximity.proximity[proximity] || 0) + 1;
  }

  return result;
};

initialize();

global.recordLocation.reset = initialize;
global.recordLocation.magicValues = new Set();

var nextLocationNumber = 1;
function getNextLocationNumber() {
  return nextLocationNumber++;
}

const oldRequireHook = require.extensions['.js'];
require.extensions['.js'] = function(module, absoluteFileName) {
  let code;
  oldRequireHook(
    Object.create(module, {
      _compile: {
        value: _code => (code = _code)
      }
    }),
    absoluteFileName
  );
  let fileNameToCheck;
  if (ignoreDirectivesRelativeTo) {
    fileNameToCheck = pathModule.relative(
      ignoreDirectivesRelativeTo,
      absoluteFileName
    );
  } else {
    fileNameToCheck = absoluteFileName;
  }

  if (
    deepIgnore.ignores(fileNameToCheck) ||
    (module.parent && module.parent._unexpectedCheckDeepIgnored)
  ) {
    module._unexpectedCheckDeepIgnored = true;
  } else if (!shallowIgnore.ignores(fileNameToCheck)) {
    console.log('instrument', fileNameToCheck);
    const ast = esprima.parseScript(code, {
      source: pathModule.relative(process.cwd(), absoluteFileName)
    });
    const { instrumentedAst, magicValues } = instrumentAst(
      ast,
      getNextLocationNumber
    );
    code = escodegen.generate(instrumentedAst);
    for (const magicValue of magicValues) {
      global.recordLocation.magicValues.add(magicValue);
    }
  }
  module._compile(code, absoluteFileName);
};
