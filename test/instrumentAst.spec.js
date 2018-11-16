/*global recordLocation, recordProximity, foo, bar, quux*/
const instrumentAst = require('../lib/instrumentAst');
const expect = require('unexpected').clone();
const esprima = require('esprima');
const escodegen = require('escodegen');

function toAst(stringOrAssetOrFunctionOrAst) {
  if (typeof stringOrAssetOrFunctionOrAst === 'string') {
    return esprima.parseModule(stringOrAssetOrFunctionOrAst);
  } else if (stringOrAssetOrFunctionOrAst.isAsset) {
    return stringOrAssetOrFunctionOrAst.parseTree;
  } else if (typeof stringOrAssetOrFunctionOrAst === 'function') {
    return {
      type: 'Program',
      body: esprima.parse('!' + stringOrAssetOrFunctionOrAst.toString()).body[0]
        .expression.argument.body.body
    };
  } else {
    return stringOrAssetOrFunctionOrAst;
  }
}

expect.addAssertion(
  '<function> to come out as <function>',
  (expect, subject, value) => {
    var nextLocationNumber = 1;
    function getNextLocationNumber() {
      return nextLocationNumber++;
    }
    expect(
      escodegen.generate(
        instrumentAst(toAst(subject), getNextLocationNumber).instrumentedAst
      ),
      'to equal',
      escodegen.generate(toAst(value))
    );
  }
);

expect.addAssertion(
  '<function|string|object> to yield magic values <array>',
  (expect, subject, expectedMagicValues) => {
    expect.errorMode = 'nested';
    expect(
      [...instrumentAst(toAst(subject), () => 1).magicValues],
      'to equal',
      expectedMagicValues
    );
  }
);

describe('instrumentAst', function() {
  it('should work with a basic example', function() {
    expect(
      /*eslint-disable*/
      function() {
        const program = input => {
          const se = input.indexOf('se');
          const cr = input.indexOf('cr');
          const et = input.indexOf('et');

          if (-1 < se) {
            if (se < cr) {
              if (cr < et) {
                throw new Error('BOOM!!!');
              }
            }
          }
        };
        program();
      },
      'to come out as',
      function() {
        const program = input => {
          recordLocation(7);
          const se = input.indexOf('se');
          const cr = input.indexOf('cr');
          const et = input.indexOf('et');

          if (recordProximity(-1, '<', se)) {
            recordLocation(5);
            if (recordProximity(se, '<', cr)) {
              recordLocation(3);
              if (recordProximity(cr, '<', et)) {
                recordLocation(1);
                throw new Error('BOOM!!!');
              } else {
                recordLocation(2);
              }
            } else {
              recordLocation(4);
            }
          } else {
            recordLocation(6);
          }
        };
        program();
      }
      /*eslint-enable*/
    );
  });

  it('should instrument a function declaration', function() {
    expect(
      function() {
        function baz() {
          bar();
        }
        baz();
      },
      'to come out as',
      function() {
        function baz() {
          recordLocation(1);
          bar();
        }
        baz();
      }
    );
  });

  it('should instrument a function expression', function() {
    expect(
      function() {
        var baz = function() {
          bar();
        };
        baz();
      },
      'to come out as',
      function() {
        var baz = function() {
          recordLocation(1);
          bar();
        };
        baz();
      }
    );
  });

  it('should instrument an arrow function', function() {
    expect(
      function() {
        var baz = () => {
          bar();
        };
        baz();
      },
      'to come out as',
      function() {
        var baz = () => {
          recordLocation(1);
          bar();
        };
        baz();
      }
    );
  });

  it('should instrument an arrow function with an expression body', function() {
    /*eslint-disable*/
    expect(
      function() {
        var baz = () => bar();
        baz();
      },
      'to come out as',
      function() {
        var baz = () => (recordLocation(1), bar());
        baz();
      }
    );
    /*eslint-enable*/
  });

  it('should instrument a getter', function() {
    expect(
      function() {
        var baz = {
          get foo() {
            return bar();
          }
        };
        baz();
      },
      'to come out as',
      function() {
        var baz = {
          get foo() {
            recordLocation(1);
            return bar();
          }
        };
        baz();
      }
    );
  });

  it('should instrument an if statement', function() {
    expect(
      /*eslint-disable*/
      function() {
        if (true) {
          foo();
        } else {
          bar();
        }
      },
      'to come out as',
      function() {
        if (true) {
          recordLocation(1);
          foo();
        } else {
          recordLocation(2);
          bar();
        }
      }
      /*eslint-enable*/
    );
  });

  it('should add and instrument the else branch if not already present', function() {
    expect(
      /*eslint-disable*/
      function() {
        if (true) {
          foo();
        }
      },
      'to come out as',
      function() {
        if (true) {
          recordLocation(1);
          foo();
        } else {
          recordLocation(2);
        }
      }
      /*eslint-enable*/
    );
  });

  it('should rewrite a non-block consequent to a block and add the instrumentation', function() {
    expect(
      /*eslint-disable*/
      function() {
        if (true) bar();
      },
      'to come out as',
      function() {
        if (true) {
          recordLocation(1);
          bar();
        } else {
          recordLocation(2);
        }
      }
      /*eslint-enable*/
    );
  });

  it('should rewrite a non-block else to a block and add the instrumentation', function() {
    expect(
      /*eslint-disable*/
      function() {
        if (true) {
          bar();
        } else quux();
      },
      'to come out as',
      function() {
        if (true) {
          recordLocation(1);
          bar();
        } else {
          recordLocation(2);
          quux();
        }
      }
      /*eslint-enable*/
    );
  });

  describe('with a while loop', function() {
    it('should instrument the body', function() {
      expect(
        function() {
          while (foo()) {
            bar();
          }
        },
        'to come out as',
        function() {
          while (foo()) {
            recordLocation(1);
            bar();
          }
        }
      );
    });

    it('should convert a non-block body to a block', function() {
      expect(
        /*eslint-disable*/
        function() {
          while (foo()) bar();
        },
        'to come out as',
        function() {
          while (foo()) {
            recordLocation(1);
            bar();
          }
        }
        /*eslint-enable*/
      );
    });

    it('should convert an empty body to a block', function() {
      expect(
        /*eslint-disable*/
        function() {
          while (foo());
        },
        'to come out as',
        function() {
          while (foo()) {
            recordLocation(1);
          }
        }
        /*eslint-enable*/
      );
    });
  });

  describe('with a do..while loop', function() {
    it('should instrument the body', function() {
      expect(
        function() {
          do {
            bar();
          } while (foo());
        },
        'to come out as',
        function() {
          do {
            recordLocation(1);
            bar();
          } while (foo());
        }
      );
    });

    it('should convert a non-block body to a block', function() {
      expect(
        /*eslint-disable*/
        function() {
          do bar();
          while (foo());
        },
        'to come out as',
        function() {
          do {
            recordLocation(1);
            bar();
          } while (foo());
        }
        /*eslint-enable*/
      );
    });
  });

  describe('with a for loop', function() {
    it('should instrument the body', function() {
      expect(
        function() {
          for (var i = 0; i < 10; i += 1) {
            bar();
          }
        },
        'to come out as',
        function() {
          for (var i = 0; recordProximity(i, '<', 10); i += 1) {
            recordLocation(1);
            bar();
          }
        }
      );
    });

    it('should convert a non-block body to a block', function() {
      expect(
        /*eslint-disable*/
        function() {
          for (var i = 0; i < 10; i += 1) bar();
        },
        'to come out as',
        function() {
          for (var i = 0; recordProximity(i, '<', 10); i += 1) {
            recordLocation(1);
            bar();
          }
        }
        /*eslint-enable*/
      );
    });

    it('should convert an empty body to a block', function() {
      expect(
        /*eslint-disable*/
        function() {
          for (var i = 0; i < 10; i += 1);
        },
        'to come out as',
        function() {
          for (var i = 0; recordProximity(i, '<', 10); i += 1) {
            recordLocation(1);
          }
        }
        /*eslint-enable*/
      );
    });
  });

  describe('with a for...in loop', function() {
    it('should instrument the body', function() {
      expect(
        function() {
          for (var a in bar()) {
            a();
          }
        },
        'to come out as',
        function() {
          for (var a in bar()) {
            recordLocation(1);
            a();
          }
        }
      );
    });

    it('should convert a non-block body to a block', function() {
      expect(
        /*eslint-disable*/
        function() {
          for (var a in bar()) a();
        },
        'to come out as',
        function() {
          for (var a in bar()) {
            recordLocation(1);
            a();
          }
        }
        /*eslint-enable*/
      );
    });

    it('should convert an empty body to a block', function() {
      expect(
        /*eslint-disable*/
        function() {
          for (var a in bar());
        },
        'to come out as',
        function() {
          for (var a in bar()) {
            recordLocation(1);
          }
        }
        /*eslint-enable*/
      );
    });
  });

  describe('with a for...of loop', function() {
    it('should instrument the body', function() {
      expect(
        function() {
          for (var a of bar()) {
            a();
          }
        },
        'to come out as',
        function() {
          for (var a of bar()) {
            recordLocation(1);
            a();
          }
        }
      );
    });

    it('should convert a non-block body to a block', function() {
      expect(
        /*eslint-disable*/
        function() {
          for (var a of bar()) a();
        },
        'to come out as',
        function() {
          for (var a of bar()) {
            recordLocation(1);
            a();
          }
        }
        /*eslint-enable*/
      );
    });

    it('should convert an empty body to a block', function() {
      expect(
        /*eslint-disable*/
        function() {
          for (var a of bar());
        },
        'to come out as',
        function() {
          for (var a of bar()) {
            recordLocation(1);
          }
        }
        /*eslint-enable*/
      );
    });
  });

  it('should instrument a switch statement', function() {
    expect(
      /*eslint-disable*/
      function() {
        switch (foo) {
          case 'bar':
            bar();
            bar();
          case 'quux':
            quux();
          default:
            quux();
        }
      },
      'to come out as',
      function() {
        switch (foo) {
          case 'bar':
            recordLocation(1);
            bar();
            bar();
          case 'quux':
            recordLocation(2);
            quux();
          default:
            recordLocation(3);
            quux();
        }
      }
      /*eslint-enable*/
    );
  });

  it('should instrument a ternary', function() {
    expect(
      /*eslint-disable*/
      function() {
        foo() ? quux() + 123 : bar();
      },
      'to come out as',
      function() {
        foo() ? (recordLocation(1), quux() + 123) : (recordLocation(2), bar());
      }
      /*eslint-enable*/
    );
  });

  it('should instrument the RHS of a logical and', function() {
    expect(
      /*eslint-disable*/
      function() {
        foo() && bar();
      },
      'to come out as',
      function() {
        foo() && (recordLocation(1), bar());
      }
      /*eslint-enable*/
    );
  });

  it('should instrument the RHS of a logical or', function() {
    expect(
      /*eslint-disable*/
      function() {
        foo() || bar();
      },
      'to come out as',
      function() {
        foo() || (recordLocation(1), bar());
      }
      /*eslint-enable*/
    );
  });

  it('should instrument a default parameter', function() {
    expect(
      /*eslint-disable*/
      function() {
        function baz({ theThing } = {}) {}
        baz();
      },
      'to come out as',
      function() {
        function baz({ theThing } = (recordLocation(1), {})) {
          recordLocation(2);
        }
        baz();
      }
      /*eslint-enable*/
    );
  });

  describe('with a try...catch', function() {
    it('should instrument the catch block', function() {
      expect(
        function() {
          try {
            foo();
          } catch (err) {
            bar();
          }
        },
        'to come out as',
        function() {
          try {
            foo();
          } catch (err) {
            recordLocation(1);
            bar();
          }
        }
      );
    });
  });

  describe('with a try...finally', function() {
    it('should not make any modifications', function() {
      expect(
        function() {
          try {
            foo();
          } finally {
            bar();
          }
        },
        'to come out as',
        function() {
          try {
            foo();
          } finally {
            bar();
          }
        }
      );
    });
  });

  describe('gathering of magic values', function() {
    it('should extract string literals', function() {
      expect(
        function() {
          if (foo() === 'bar' && (bar() === 456) === true) {
            return 'yeah';
          }
        },
        'to yield magic values',
        ['bar', 456, 'yeah']
      );
    });

    it('should extract literal switch cases', function() {
      expect(
        function() {
          switch (foo()) {
            case 'bar':
              break;
          }
        },
        'to yield magic values',
        ['bar']
      );
    });

    it('should not extract magic values from static require(<string>) expressions', function() {
      expect(
        function() {
          require('./bar')(123);
        },
        'to yield magic values',
        [123]
      );
    });

    // Not sure how useful this actually is, but at least it serves to document
    // the current behavior:
    it('should extract magic values from dynamic require(...) expressions', function() {
      expect(
        function() {
          require('./bar' + 456)(123);
        },
        'to yield magic values',
        ['./bar', 456, 123]
      );
    });

    it('should not extract magic values from `import ... from <string>` expressions', function() {
      expect("import foo from 'bar'; foo(123);", 'to yield magic values', [
        123
      ]);
    });

    it('should not extract magic values from `export ... from <string>` expressions', function() {
      expect(
        "export { foo } from 'bar'; alert(123);",
        'to yield magic values',
        [123]
      );
    });

    // For some reason this isn't supported by esprima 4 or estraverse yet:
    it.skip('should not extract magic values from dynamic `import(<string>)` expressions', function() {
      expect("import('foo').then(bar => 123);", 'to yield magic values', [123]);
    });
  });

  describe('with conditions that consist of a BinaryExpression', function() {
    it('should instrument the test of an if statement', function() {
      expect(
        function() {
          if (foo() < bar() + 1) {
            quux();
          }
        },
        'to come out as',
        function() {
          if (recordProximity(foo(), '<', bar() + 1)) {
            recordLocation(1);
            quux();
          } else {
            recordLocation(2);
          }
        }
      );
    });

    it('should instrument the test of a ternary', function() {
      expect(
        /*eslint-disable*/
        function() {
          foo() > bar() ? 123 : 456;
        },
        'to come out as',
        function() {
          recordProximity(foo(), '>', bar())
            ? (recordLocation(1), 123)
            : (recordLocation(2), 456);
        }
        /*eslint-enable*/
      );
    });

    it('should instrument the LHS of a logical and', function() {
      expect(
        /*eslint-disable*/
        function() {
          foo() > bar() && quux();
        },
        'to come out as',
        function() {
          recordProximity(foo(), '>', bar()) && (recordLocation(1), quux());
        }
        /*eslint-enable*/
      );
    });

    it('should instrument the LHS of a logical and', function() {
      expect(
        /*eslint-disable*/
        function() {
          foo() > bar() || quux();
        },
        'to come out as',
        function() {
          recordProximity(foo(), '>', bar()) || (recordLocation(1), quux());
        }
        /*eslint-enable*/
      );
    });
  });

  it('instruments complex expressions', () => {
    const a = 15;
    const b = 15;
    const c = 225;

    expect(
      /*eslint-disable*/
      function() {
        if (10 < a && b < 20 && a === b && a * b === c) {
          console.log('success');
        }
      },
      'to come out as',
      function() {
        if (
          recordProximity(10, '<', a) &&
          (recordLocation(1), recordProximity(b, '<', 20)) &&
          (recordLocation(2), recordProximity(a, '===', b)) &&
          (recordLocation(3), recordProximity(a * b, '===', c))
        ) {
          recordLocation(4);
          console.log('success');
        } else {
          recordLocation(5);
        }
      }
      /*eslint-enable*/
    );
  });
});
