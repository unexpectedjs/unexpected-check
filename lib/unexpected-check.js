/*global window*/
// Copyright (c) 2016 Sune Simonsen <sune@we-knowhow.dk>
//
// Permission is hereby granted, free of charge, to any person
// obtaining a copy of this software and associated documentation
// files (the 'Software'), to deal in the Software without
// restriction, including without limitation the rights to use, copy,
// modify, merge, publish, distribute, sublicense, and/or sell copies
// of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
// BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
// CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

(function (root, factory) {
    if (typeof exports === 'object') {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define(factory);
    } else {
        root.weknowhow = root.weknowhow || {};
        root.weknowhow.unexpectedCheck = factory();
    }
})(this, function () {
    var defaultMaxIterations = 300;
    if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
        var m = window.location.search.match(/[?&]maxiterations=(\d+)(?:$|&)/);
        if (m) {
            defaultMaxIterations = parseInt(m[1], 10);
        }
    } else if (typeof process !== 'undefined' && process.env.UNEXPECTED_CHECK_MAX_ITERATIONS) {
        defaultMaxIterations = parseInt(process.env.UNEXPECTED_CHECK_MAX_ITERATIONS, 10);
    }

    return {
        name: 'unexpected-check',
        installInto: function (expect) {
            expect.addType({
                name: 'chance-generator',
                identify: function (value) {
                    return value && value.isGenerator;
                },
                inspect: function (value, depth, output) {
                    output.jsFunctionName(value.generatorName);
                    if (value.args.length > 0) {
                        output.text('(').appendItems(value.args, ', ').text(')');
                    }
                }
            });

            expect.addType({
                name: 'mapped-chance-generator',
                identify: function (value) {
                    return value && value.isGenerator && value.isMappedGenerator;
                },
                inspect: function (value, depth, output, inspect) {
                    output.appendInspected(value.parentGenerator)
                      .text('.').jsFunctionName('map').text('(')
                      .appendInspected(value.mapFunction)
                      .text(')');
                }
            });

            var promiseLoop = function (condition, action) {
                return expect.promise(function (resolve, reject) {
                    var loop = function () {
                        if (!condition()) {
                            return resolve();
                        }

                        return action()
                            .then(loop)
                            .catch(reject);
                    };

                    loop();
                });
            };

            expect.addAssertion('<function> to be valid for all <object>', function (expect, subject, options) {
                var generators = options.generators || [];
                var maxIterations = options.maxIterations || defaultMaxIterations;
                var maxErrorIterations = options.maxErrorIterations || 1000;
                var maxErrors = options.maxErrors || 20;

                function createTask() {
                    var args = generators.map(function (g) {
                        return g();
                    });

                    var task = {
                        args: args
                    };

                    return task;
                }

                function hasShrinkableGenerators() {
                    return generators.some(function (g) {
                        return g.shrink;
                    });
                }

                function createTasks() {
                    var tasks = [];
                    var errors = 0;
                    var i = 0;

                    return promiseLoop(function () {
                        return (
                            (
                                errors === 0
                                  ? i < maxIterations
                                  : i < maxErrorIterations
                            ) &&
                            errors < maxErrors &&
                            (errors === 0 || hasShrinkableGenerators())
                        );
                    }, function () {
                        var task = createTask();
                        tasks.push(task);

                        return expect.promise(function () {
                            return subject.apply(null, task.args);
                        }).then(function () {
                            i++;
                        }, function (err) {
                            generators = generators.map(function (g, i) {
                                return g.shrink ? g.shrink(task.args[i]) : g;
                            });
                            task.error = err;
                            errors++;
                            i++;
                        });
                    }).then(function () {
                        return tasks;
                    });
                }

                return createTasks().then(function (tasks) {
                    var failedTasks = tasks.filter(function (task) {
                        return task.error;
                    });

                    if (failedTasks.length > 0) {
                        var bestFailure = failedTasks[failedTasks.length - 1];

                        expect.errorMode = 'bubble';
                        expect.fail(function (output) {
                            output.error('Ran ').jsNumber(tasks.length).sp()
                                .error(tasks.length > 1 ? 'iterations' : 'iteration')
                                .error(' and found ').jsNumber(failedTasks.length).error(' errors').nl()
                                .error('counterexample:').nl(2);

                            output.indentLines();
                            output.i().block(function (output) {
                                output.text('Generated input: ').appendItems(bestFailure.args, ', ').nl()
                                  .text('with: ').appendItems(options.generators, ', ').nl(2)
                                  .block(function (output) {
                                      output.appendErrorMessage(bestFailure.error);
                                  });
                            });
                        });
                    }
                });
            });

            expect.addAssertion('<function> to be valid for all <function+>', function (expect, subject) {
                expect.errorMode = 'bubble';

                return expect(subject, 'to be valid for all', {
                    generators: Array.prototype.slice.call(arguments, 2)
                });
            });
        }
    };
});
