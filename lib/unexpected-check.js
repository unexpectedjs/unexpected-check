/*global location*/
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
    return {
        name: 'unexpected-check',
        installInto: function (expect) {
            // TODO can these be configurable?
            var maxIterations = 100;
            var maxErrors = 20;

            function createTask(subject, generators) {
                var args = generators.map(function (generator) {
                    return generator();
                });

                return {
                    args: args,
                    promise: expect.promise(function () {
                        return subject.apply(null, args);
                    })
                };
            }

            function createTasks(subject, generators) {
                var tasks = [];
                var errors = 0;
                for (var i = 0; i < maxIterations && errors < maxErrors; i += 1) {
                    var task = createTask(subject, generators);
                    tasks.push(task);
                    if (task.promise.isRejected()) {
                        errors++;
                    }
                }
                return tasks;
            }

            expect.addAssertion('<function> to be valid for all <function+>', function (expect, subject) {
                var generators = Array.prototype.slice.call(arguments, 2);
                var tasks = createTasks(subject, generators);

                return expect.promise.all(tasks).caught(function (err) {
                    return expect.promise.settle(tasks).then(function () {
                        var failedTasks = tasks.filter(function (task) {
                            return task.promise.isRejected()
                        })

                        var bestFailure = failedTasks[0];
                        var currentSize;
                        failedTasks.forEach(function (task) {
                            var currentSize = currentSize || bestFailure.promise.reason().getErrorMessage('text').size();
                            var newSize = task.promise.reason().getErrorMessage('text').size();
                            if (
                                (newSize.height < currentSize.height) ||
                                (newSize.height === currentSize.height && newSize.width < currentSize.width)
                            ) {
                                bestFailure = task;
                                currentSize = newSize;
                            }
                        });

                        expect.errorMode = 'bubble';
                        expect.fail(function (output) {
                            output.error('Ran ').jsNumber(tasks.length).sp()
                                  .error(tasks.length > 1 ? 'iterations' : 'iteration')
                                  .error(' and found ').jsNumber(failedTasks.length).error(' errors').nl()
                                  .error('counter example:').nl(2)

                            output.indentLines();
                            output.i().block(function (output) {
                                output.text('Generated input: ').appendItems(bestFailure.args, ', ');
                                output.nl(2).block(function (output) {
                                    var error = bestFailure.promise.reason();
                                    output.appendErrorMessage(error);
                                })
                            });
                        })
                    });
                });
            })
        }
    };
});
