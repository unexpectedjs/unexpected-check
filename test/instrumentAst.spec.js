/*global recordLocation, foo, bar, quux*/
const instrumentAst = require('../lib/instrumentAst');
const expect = require('unexpected').clone();
const esprima = require('esprima');
const escodegen = require('escodegen');

function toAst(stringOrAssetOrFunctionOrAst) {
    if (typeof stringOrAssetOrFunctionOrAst === 'string') {
        return esprima.parse(stringOrAssetOrFunctionOrAst);
    } else if (stringOrAssetOrFunctionOrAst.isAsset) {
        return stringOrAssetOrFunctionOrAst.parseTree;
    } else if (typeof stringOrAssetOrFunctionOrAst === 'function') {
        return { type: 'Program', body: esprima.parse('!' + stringOrAssetOrFunctionOrAst.toString()).body[0].expression.argument.body.body };
    } else {
        return stringOrAssetOrFunctionOrAst;
    }
}

expect.addAssertion('<function> to come out as <function>', (expect, subject, value) => {
    var nextLocationNumber = 1;
    function getNextLocationNumber() {
        return nextLocationNumber++;
    }
    expect(
        escodegen.generate(instrumentAst(toAst(subject), getNextLocationNumber)),
        '[not] to equal',
        escodegen.generate(toAst(value))
    );
});

describe('instrumentAst', function () {
    it('should work with a basic example', function () {
        expect(function () {
            const program = (input) => {
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
        }, 'to come out as', function () {
            const program = (input) => {
                recordLocation(1);
                const se = input.indexOf('se');
                const cr = input.indexOf('cr');
                const et = input.indexOf('et');

                if (-1 < se) {
                    recordLocation(2);
                    if (se < cr) {
                        recordLocation(4);
                        if (cr < et) {
                            recordLocation(6);
                            throw new Error('BOOM!!!');
                        } else {
                            recordLocation(7);
                        }
                    } else {
                        recordLocation(5);
                    }
                } else {
                    recordLocation(3);
                }
            };
            program();
        });
    });

    it('should instrument a function declaration', function () {
        expect(function () {
            function baz() {
                bar();
            }
            baz();
        }, 'to come out as', function () {
            function baz() {
                recordLocation(1);
                bar();
            }
            baz();
        });
    });

    it('should instrument a function expression', function () {
        expect(function () {
            var baz = function () {
                bar();
            };
            baz();
        }, 'to come out as', function () {
            var baz = function () {
                recordLocation(1);
                bar();
            };
            baz();
        });
    });

    it('should instrument an arrow function', function () {
        expect(function () {
            var baz = () => {
                bar();
            };
            baz();
        }, 'to come out as', function () {
            var baz = () => {
                recordLocation(1);
                bar();
            };
            baz();
        });
    });

    it('should instrument a getter', function () {
        expect(function () {
            var baz = {
                get foo() {
                    return bar();
                }
            };
            baz();
        }, 'to come out as', function () {
            var baz = {
                get foo() {
                    recordLocation(1);
                    return bar();
                }
            };
            baz();
        });
    });

    it('should instrument an if statement', function () {
        expect(function () {
            if (true) {
                foo();
            } else {
                bar();
            }
        }, 'to come out as', function () {
            if (true) {
                recordLocation(1);
                foo();
            } else {
                recordLocation(2);
                bar();
            }
        });
    });

    it('should rewrite a non-block consequent to a block and add the instrumentation', function () {
        expect(function () {
            /* eslint-disable curly */
            if (true) bar();
            /* eslint-enable curly */
        }, 'to come out as', function () {
            if (true) {
                recordLocation(1);
                bar();
            } else {
                recordLocation(2);
            }
        });
    });

    it('should rewrite a non-block else to a block and add the instrumentation', function () {
        expect(function () {
            /* eslint-disable curly */
            if (true) {
                bar();
            } else quux();
            /* eslint-enable curly */
        }, 'to come out as', function () {
            if (true) {
                recordLocation(1);
                bar();
            } else {
                recordLocation(2);
                quux();
            }
        });
    });

    describe('with a while loop', function () {
        it('should instrument the body', function () {
            expect(function () {
                while (foo()) {
                    bar();
                }
            }, 'to come out as', function () {
                while (foo()) {
                    recordLocation(1);
                    bar();
                }
            });
        });

        it('should convert a non-block body to a block', function () {
            expect(function () {
                /* eslint-disable curly */
                while (foo()) bar();
                /* eslint-enable curly */
            }, 'to come out as', function () {
                while (foo()) {
                    recordLocation(1);
                    bar();
                }
            });
        });

        it('should convert an empty body to a block', function () {
            expect(function () {
                /* eslint-disable curly */
                while (foo());
                /* eslint-enable curly */
            }, 'to come out as', function () {
                while (foo()) {
                    recordLocation(1);
                }
            });
        });
    });

    describe('with a do..while loop', function () {
        it('should instrument the body', function () {
            expect(function () {
                do {
                    bar();
                } while (foo());
            }, 'to come out as', function () {
                do {
                    recordLocation(1);
                    bar();
                } while (foo());
            });
        });

        it('should convert a non-block body to a block', function () {
            expect(function () {
                /* eslint-disable curly */
                do bar(); while (foo());
                /* eslint-enable curly */
            }, 'to come out as', function () {
                do {
                    recordLocation(1);
                    bar();
                } while (foo());
            });
        });
    });

    describe('with a for loop', function () {
        it('should instrument the body', function () {
            expect(function () {
                for (var i = 0 ; i < 10 ; i += 1) {
                    bar();
                }
            }, 'to come out as', function () {
                for (var i = 0 ; i < 10 ; i += 1) {
                    recordLocation(1);
                    bar();
                }
            });
        });

        it('should convert a non-block body to a block', function () {
            expect(function () {
                /* eslint-disable curly */
                for (var i = 0 ; i < 10 ; i += 1) bar();
                /* eslint-enable curly */
            }, 'to come out as', function () {
                for (var i = 0 ; i < 10 ; i += 1) {
                    recordLocation(1);
                    bar();
                }
            });
        });

        it('should convert an empty body to a block', function () {
            expect(function () {
                /* eslint-disable curly */
                for (var i = 0 ; i < 10 ; i += 1);
                /* eslint-enable curly */
            }, 'to come out as', function () {
                for (var i = 0 ; i < 10 ; i += 1) {
                    recordLocation(1);
                }
            });
        });
    });

    describe('with a for...in loop', function () {
        it('should instrument the body', function () {
            expect(function () {
                for (var a in bar()) {
                    a();
                }
            }, 'to come out as', function () {
                for (var a in bar()) {
                    recordLocation(1);
                    a();
                }
            });
        });

        it('should convert a non-block body to a block', function () {
            expect(function () {
                /* eslint-disable curly */
                for (var a in bar()) bar();
                /* eslint-enable curly */
            }, 'to come out as', function () {
                for (var a in bar()) {
                    recordLocation(1);
                    bar();
                }
            });
        });

        it('should convert an empty body to a block', function () {
            expect(function () {
                /* eslint-disable curly */
                for (var a in bar());
                /* eslint-enable curly */
            }, 'to come out as', function () {
                for (var a in bar()) {
                    recordLocation(1);
                }
            });
        });
    });

    it('should instrument a switch statement', function () {
        expect(function () {
            switch (foo) {
            case 'bar':
                bar();
                bar();
            case 'quux':
                quux();
            default:
                quux();
            }
        }, 'to come out as', function () {
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
        });
    });

    it('should instrument a ternary', function () {
        expect(function () {
            foo() ? quux() + 123 : bar();
        }, 'to come out as', function () {
            foo() ? (recordLocation(1), quux() + 123) : (recordLocation(2), bar());
        });
    });

    it('should instrument the RHS of a logical and', function () {
        expect(function () {
            foo() && bar();
        }, 'to come out as', function () {
            foo() && (recordLocation(1), bar());
        });
    });

    it('should instrument the RHS of a logical or', function () {
        expect(function () {
            foo() || bar();
        }, 'to come out as', function () {
            foo() || (recordLocation(1), bar());
        });
    });

    describe('with a try...catch', function () {
        it('should instrument the catch block', function () {
            expect(function () {
                try {
                    foo();
                } catch (err) {
                    bar();
                }
            }, 'to come out as', function () {
                try {
                    foo();
                } catch (err) {
                    recordLocation(1);
                    bar();
                }
            });
        });
    });

    describe('with a try...finally', function () {
        it('should not make any modifications', function () {
            expect(function () {
                try {
                    foo();
                } finally {
                    bar();
                }
            }, 'to come out as', function () {
                try {
                    foo();
                } finally {
                    bar();
                }
            });
        });
    });
});
