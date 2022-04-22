/* global window, define */
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
  let defaultMaxIterations = 300;
  if (
    typeof process !== 'undefined' &&
    process.env.UNEXPECTED_CHECK_MAX_ITERATIONS
  ) {
    defaultMaxIterations = parseInt(
      process.env.UNEXPECTED_CHECK_MAX_ITERATIONS,
      10
    );
  } else if (
    typeof window !== 'undefined' &&
    typeof window.location !== 'undefined'
  ) {
    const m = window.location.search.match(/[?&]maxiterations=(\d+)(?:$|&)/);
    if (m) {
      defaultMaxIterations = parseInt(m[1], 10);
    }
  }

  function copyProximity() {
    const proximity = global.recordProximity.proximity;
    const aKeys = Object.keys(proximity)
      .map(Number)
      .sort(function (a, b) {
        return a - b;
      });

    return aKeys.reduce(function (result, key) {
      result[key] = proximity[key];
      return result;
    }, {});
  }

  function isProximityLessThan(a, b) {
    // keys are already ordered
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);

    for (let i = 0; i < aKeys.length; i += 1) {
      const aKey = Number(aKeys[i]);
      const bKey = Number(bKeys[i]);

      if (aKey < bKey) {
        return true;
      } else if (aKey > bKey) {
        return false;
      }

      const aCount = a[aKey];
      const bCount = b[bKey] || 0;
      if (aCount > bCount) {
        return true;
      } else if (aCount < bCount) {
        return false;
      }
    }

    return aKeys.length > bKeys.length;
  }

  return {
    name: 'unexpected-check',
    installInto: function (expect) {
      expect.addType({
        base: 'object',
        name: 'chance-generator',
        identify: function (value) {
          return value && value.isGenerator;
        },
        inspect: function (value, depth, output) {
          output.jsFunctionName(value.generatorName);
          if (value.options && Object.keys(value.options).length > 0) {
            output.text('(').appendInspected(value.options).text(')');
          }
        },
      });

      expect.addType({
        base: 'chance-generator',
        name: 'mapped-chance-generator',
        identify: function (value) {
          return value && value.isMappedGenerator;
        },
        inspect: function (value, depth, output, inspect) {
          output
            .appendInspected(value.parentGenerator)
            .text('.')
            .jsFunctionName('map')
            .text('(')
            .appendInspected(value.options.mapper)
            .text(')');
        },
      });

      expect.addType({
        name: 'fuzzed-generator',
        identify: function (value) {
          return value && value.isFuzzedGenerator;
        },
        inspect: function (value, depth, output, inspect) {
          output
            .jsFunctionName('fuzz')
            .text('(')
            .appendItems(value.args, ', ')
            .text(', ')
            .appendInspected(value.mutatorFunction)
            .text(')');
        },
      });

      expect.addType({
        base: 'Error',
        name: 'AssertionError',
        identify: function (err) {
          return (
            err &&
            typeof err === 'object' &&
            err.constructor &&
            err.constructor.name === 'AssertionError'
          );
        },
        inspect: function (value, depth, output, inspect) {
          output.error(value.message);
        },
      });

      const promiseLoop = function (condition, action) {
        return expect.promise(function (resolve, reject) {
          const loop = function () {
            if (!condition()) {
              return resolve();
            }

            return action().then(loop).catch(reject);
          };

          loop();
        });
      };

      expect.addAssertion(
        '<function> to be valid for all <object>',
        function (expect, subject, options) {
          const generators = options.generators || [];
          const maxIterations = options.maxIterations || defaultMaxIterations;
          const maxErrorIterations = options.maxErrorIterations || 1000;
          const maxErrors = options.maxErrors || 201;
          const interestingInputs = {};
          const hasInstrumentation = !!global.recordLocation;
          const seed = 42;

          let iterators = generators.map(function (generator, index) {
            if (!generator.values) {
              throw new Error(
                'Generators needs to have a values method that returns an iterator\n' +
                  'See: https://sunesimonsen.github.io/chance-generators/api/generator/'
              );
            }

            return generator.values({
              skipSeedCache: true,
              seed: seed + index,
            });
          });

          function resetIterators() {
            iterators = generators.map(function (generator, index) {
              return generator.values({
                skipSeedCache: true,
                seed: seed + index,
              });
            });
          }

          function createTask() {
            const args = iterators.map(function (iterator) {
              return iterator.next();
            });

            const task = {
              args,
            };

            return task;
          }

          function hasShrinkableIterators() {
            return iterators.some(function (iterator) {
              return iterator.isShrinkable;
            });
          }

          function runTasks() {
            const tasks = [];
            let errors = 0;
            let i = 0;
            let j = 0;

            function calculateInvestigations() {
              return Math.min(Math.floor((maxIterations - i) * 0.1), 10000);
            }

            let investigations = Math.min(
              Math.ceil(maxIterations * 0.01),
              1000
            );

            return promiseLoop(
              function () {
                return (
                  (errors === 0
                    ? i++ < maxIterations
                    : j++ < maxErrorIterations) &&
                  errors < maxErrors &&
                  (errors === 0 || hasShrinkableIterators())
                );
              },
              function () {
                const task = createTask();
                tasks.push(task);

                if (hasInstrumentation) {
                  global.recordLocation.reset();
                }

                return expect
                  .promise(function () {
                    return subject.apply(null, task.args);
                  })
                  .then(
                    function () {
                      if (hasInstrumentation && errors === 0) {
                        const key = Object.keys(
                          global.recordLocation.locations
                        ).join(',');
                        const interestingInput = interestingInputs[key];
                        investigations--;

                        if (interestingInput) {
                          if (investigations > 0) {
                            const proximity = copyProximity();
                            if (
                              isProximityLessThan(
                                proximity,
                                interestingInput.proximity
                              )
                            ) {
                              interestingInput.deadEnd = false;
                              interestingInput.input = task.args;
                              interestingInput.proximity = proximity;
                            }
                          }

                          if (
                            interestingInput.deadEnd ||
                            investigations === 0
                          ) {
                            investigations = calculateInvestigations();

                            // TODO check the iterations
                            interestingInput.deadEnd = true;

                            const keys = Object.keys(interestingInputs);

                            let newInterestingInput = null;
                            for (
                              let i = keys.length - 1;
                              i >= 0 && !newInterestingInput;
                              i--
                            ) {
                              const candidate = interestingInputs[keys[i]];
                              if (!candidate.deadEnd) {
                                newInterestingInput = candidate;
                              }
                            }

                            resetIterators();

                            if (newInterestingInput) {
                              iterators.forEach(function (iterator, i) {
                                iterator.expand(newInterestingInput.input[i]);
                              });
                            }
                          }
                        } else {
                          interestingInputs[key] = {
                            input: task.args,
                            location: Object.create(
                              global.recordLocation.locations
                            ),
                            proximity: copyProximity(),
                          };
                        }
                      }
                    },
                    function (err) {
                      if (errors === 0) {
                        resetIterators();
                      }

                      iterators.forEach(function (iterator, i) {
                        iterator.shrink(task.args[i]);
                      });
                      task.error = err;
                      errors++;
                    }
                  );
              }
            ).then(function () {
              return {
                tasks,
                iterations: i,
                errorIterations: j,
                errors,
              };
            });
          }

          return runTasks().then(function (execution) {
            const failedTasks = execution.tasks.filter(function (task) {
              return task.error;
            });

            if (failedTasks.length > 0) {
              const bestFailure = failedTasks[failedTasks.length - 1];

              expect.errorMode = 'bubble';
              expect.fail(function (output) {
                output
                  .error('Found an error after')
                  .sp()
                  .jsNumber(execution.iterations)
                  .sp()
                  .error(execution.iterations > 1 ? 'iterations' : 'iteration');

                if (execution.errors > 1) {
                  output
                    .error(',')
                    .sp()
                    .jsNumber(execution.errors - 1)
                    .sp()
                    .error('additional')
                    .sp()
                    .error(execution.errors > 2 ? 'errors' : 'error')
                    .sp()
                    .error('found.');
                }

                output.nl().jsComment('counterexample:').nl(2);

                output.indentLines();
                output.i().block(function (output) {
                  output
                    .text('Generated input: ')
                    .appendItems(bestFailure.args, ', ')
                    .nl()
                    .text('with: ')
                    .appendItems(options.generators, ', ')
                    .nl(2)
                    .block(function (output) {
                      if (
                        bestFailure.error.isUnexpected ||
                        expect
                          .findTypeOf(bestFailure.error)
                          .is('AssertionError')
                      ) {
                        output.appendErrorMessage(bestFailure.error);
                      } else {
                        output.error(bestFailure.error.stack);
                      }
                    });
                });
              });
            }
          });
        }
      );

      expect.addAssertion(
        '<function> to be valid for all <chance-generator+>',
        function (expect, subject) {
          expect.errorMode = 'bubble';

          return expect(subject, 'to be valid for all', {
            generators: Array.prototype.slice.call(arguments, 2),
          });
        }
      );

      function FuzzedGenerator(value, mutatingGenerator) {
        this.generatorName = 'fuzz';
        this.isGenerator = true;
        this.options = {
          value,
          mutator: mutatingGenerator,
        };
      }

      FuzzedGenerator.prototype.values = function (options) {
        return this.options.mutator.values(options);
      };

      expect.addAssertion(
        '<any> [when] fuzzed by <function> <assertion>',
        function (expect, subject, mutator) {
          expect.errorMode = 'bubble';
          const mutatingGenerator = mutator(subject);

          expect(mutatingGenerator, 'to satisfy', {
            isGenerator: true,
          });

          return expect(
            function (value) {
              return expect.shift(value);
            },
            'to be valid for all',
            new FuzzedGenerator(subject, mutatingGenerator)
          );
        }
      );
    },
  };
});
