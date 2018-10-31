/*global window, define*/
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

(function(root, factory) {
  if (typeof exports === 'object') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define(factory);
  } else {
    root.weknowhow = root.weknowhow || {};
    root.weknowhow.unexpectedCheck = factory();
  }
})(this, function() {
  var defaultMaxIterations = 300;
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
    var m = window.location.search.match(/[?&]maxiterations=(\d+)(?:$|&)/);
    if (m) {
      defaultMaxIterations = parseInt(m[1], 10);
    }
  }

  function copyProximity() {
    var proximity = global.recordProximity.proximity;
    var aKeys = Object.keys(proximity)
      .map(Number)
      .sort(function(a, b) {
        return a - b;
      });

    return aKeys.reduce(function(result, key) {
      result[key] = proximity[key];
      return result;
    }, {});
  }

  function isProximityLessThan(a, b) {
    // keys are lready ordered
    var aKeys = Object.keys(a);
    var bKeys = Object.keys(b);

    for (var i = 0; i < aKeys.length; i += 1) {
      var aKey = Number(aKeys[i]);
      var bKey = Number(bKeys[i]);

      if (aKey < bKey) {
        return true;
      } else if (aKey > bKey) {
        return false;
      }

      var aCount = a[aKey];
      var bCount = b[bKey] || 0;
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
    installInto: function(expect) {
      expect.addType({
        base: 'object',
        name: 'chance-generator',
        identify: function(value) {
          return value && value.isGenerator;
        },
        inspect: function(value, depth, output) {
          output.jsFunctionName(value.generatorName);
          if (value.options && Object.keys(value.options).length > 0) {
            output
              .text('(')
              .appendInspected(value.options)
              .text(')');
          }
        }
      });

      expect.addType({
        base: 'chance-generator',
        name: 'mapped-chance-generator',
        identify: function(value) {
          return value && value.isMappedGenerator;
        },
        inspect: function(value, depth, output, inspect) {
          output
            .appendInspected(value.parentGenerator)
            .text('.')
            .jsFunctionName('map')
            .text('(')
            .appendInspected(value.options.mapper)
            .text(')');
        }
      });

      expect.addType({
        name: 'fuzzed-generator',
        identify: function(value) {
          return value && value.isFuzzedGenerator;
        },
        inspect: function(value, depth, output, inspect) {
          output
            .jsFunctionName('fuzz')
            .text('(')
            .appendItems(value.args, ', ')
            .text(', ')
            .appendInspected(value.mutatorFunction)
            .text(')');
        }
      });

      var promiseLoop = function(condition, action) {
        return expect.promise(function(resolve, reject) {
          var loop = function() {
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

      expect.addAssertion('<function> to be valid for all <object>', function(
        expect,
        subject,
        options
      ) {
        var generators = options.generators || [];
        var maxIterations = options.maxIterations || defaultMaxIterations;
        var maxErrorIterations = options.maxErrorIterations || 1000;
        var maxErrors = options.maxErrors || 201;
        var interestingInputs = {};
        var hasInstrumentation = !!global.recordLocation;

        var iterators = generators.map(function(generator) {
          if (!generator.values) {
            throw new Error(
              'Generators needs to have a values method that returns an iterator\n' +
                'See: https://sunesimonsen.github.io/chance-generators/api/generator/'
            );
          }

          return generator.values();
        });

        function resetIterators() {
          iterators = generators.map(function(generator) {
            return generator.values();
          });
        }

        function createTask() {
          var args = iterators.map(function(iterator) {
            return iterator.next();
          });

          var task = {
            args: args
          };

          return task;
        }

        function hasShrinkableIterators() {
          return iterators.some(function(iterator) {
            return iterator.isShrinkable;
          });
        }

        function runTasks() {
          var tasks = [];
          var errors = 0;
          var i = 0;
          var j = 0;

          function calculateInvestigations() {
            return Math.min(Math.floor((maxIterations - i) * 0.1), 10000);
          }

          var investigations = Math.min(Math.ceil(maxIterations * 0.01), 1000);

          return promiseLoop(
            function() {
              return (
                (errors === 0
                  ? i++ < maxIterations
                  : j++ < maxErrorIterations) &&
                errors < maxErrors &&
                (errors === 0 || hasShrinkableIterators())
              );
            },
            function() {
              var task = createTask();
              tasks.push(task);

              if (hasInstrumentation) {
                global.recordLocation.reset();
              }

              return expect
                .promise(function() {
                  return subject.apply(null, task.args);
                })
                .then(
                  function() {
                    if (hasInstrumentation && errors === 0) {
                      var key = Object.keys(
                        global.recordLocation.locations
                      ).join(',');
                      var interestingInput = interestingInputs[key];
                      investigations--;

                      if (interestingInput) {
                        if (investigations > 0) {
                          var proximity = copyProximity();
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

                        if (interestingInput.deadEnd || investigations === 0) {
                          investigations = calculateInvestigations();

                          // TODO check the iterations
                          interestingInput.deadEnd = true;

                          var keys = Object.keys(interestingInputs);

                          var newInterestingInput = null;
                          for (
                            var i = keys.length - 1;
                            i >= 0 && !newInterestingInput;
                            i--
                          ) {
                            var candidate = interestingInputs[keys[i]];
                            if (!candidate.deadEnd) {
                              newInterestingInput = candidate;
                            }
                          }

                          resetIterators();

                          if (newInterestingInput) {
                            iterators.forEach(function(iterator, i) {
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
                          proximity: copyProximity()
                        };
                      }
                    }
                  },
                  function(err) {
                    if (errors === 0) {
                      resetIterators();
                    }

                    iterators.forEach(function(iterator, i) {
                      iterator.shrink(task.args[i]);
                    });
                    task.error = err;
                    errors++;
                  }
                );
            }
          ).then(function() {
            return {
              tasks: tasks,
              iterations: i,
              errorIterations: j,
              errors: errors
            };
          });
        }

        return runTasks().then(function(execution) {
          var failedTasks = execution.tasks.filter(function(task) {
            return task.error;
          });

          if (failedTasks.length > 0) {
            var bestFailure = failedTasks[failedTasks.length - 1];

            expect.errorMode = 'bubble';
            expect.fail(function(output) {
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

              output
                .nl()
                .jsComment('counterexample:')
                .nl(2);

              output.indentLines();
              output.i().block(function(output) {
                output
                  .text('Generated input: ')
                  .appendItems(bestFailure.args, ', ')
                  .nl()
                  .text('with: ')
                  .appendItems(options.generators, ', ')
                  .nl(2)
                  .block(function(output) {
                    output.appendErrorMessage(bestFailure.error);
                  });
              });
            });
          }
        });
      });

      expect.addAssertion(
        '<function> to be valid for all <chance-generator+>',
        function(expect, subject) {
          expect.errorMode = 'bubble';

          return expect(subject, 'to be valid for all', {
            generators: Array.prototype.slice.call(arguments, 2)
          });
        }
      );

      function FuzzedGenerator(value, mutatingGenerator) {
        this.generatorName = 'fuzz';
        this.isGenerator = true;
        this.options = {
          value: value,
          mutator: mutatingGenerator
        };
      }

      FuzzedGenerator.prototype.values = function() {
        return this.options.mutator.values();
      };

      expect.addAssertion(
        '<any> [when] fuzzed by <function> <assertion>',
        function(expect, subject, mutator) {
          expect.errorMode = 'bubble';
          const mutatingGenerator = mutator(subject);

          expect(mutatingGenerator, 'to satisfy', {
            isGenerator: true
          });

          return expect(
            function(value) {
              return expect.shift(value);
            },
            'to be valid for all',
            new FuzzedGenerator(subject, mutatingGenerator)
          );
        }
      );
    }
  };
});
