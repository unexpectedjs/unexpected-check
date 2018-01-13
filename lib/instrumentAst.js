const estraverse = require('estraverse');

// Modifies the AST in place
function instrumentAst(ast, getNextLocationNumber) {
    function createRecordLocationExpression() {
        return {
            type: 'CallExpression',
            callee: {
                type: 'Identifier',
                name: 'recordLocation'
            },
            arguments: [
                { type: 'Literal', value: getNextLocationNumber() }
            ]
        };
    }

    function createRecordLocationStatement() {
        return {
            type: 'ExpressionStatement',
            expression: createRecordLocationExpression()
        };
    }

    const binaryOperatorsToWrap = new Set([
        '===',
        '!==',
        '==',
        '<',
        '<=',
        '>',
        '>='
    ]);

    const magicValues = new Set();

    ast = estraverse.replace(ast, {
        enter(node) {
            if (
                node.type === 'CallExpression' &&
                ((node.callee.type === 'Identifier' && node.callee.name === 'require') || node.callee.type === 'Import') &&
                node.arguments.length === 1 &&
                node.arguments[0].type === 'Literal' &&
                typeof node.arguments[0].value === 'string'
            ) {
                // Module names passed to require(...) aren't really magic, skip them:
                return this.skip();
            } else if (node.type === 'ImportDeclaration' || node.type === 'ExportNamedDeclaration') {
                return this.skip();
            } else if (node.type === 'Literal' && (typeof node.value === 'string' || typeof node.value === 'number')) {
                magicValues.add(node.value);
            }
        },

        leave(node) {
            if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && (node.callee.name === 'recordLocation' || node.callee.name === 'recordProximity')) {
                // Skip the injected instrumentation code so we don't gather magic values from it :)
                return this.skip();
            } else if (node.type === 'BinaryExpression' && binaryOperatorsToWrap.has(node.operator)) {
                return {
                    type: 'CallExpression',
                    callee: {
                        type: 'Identifier',
                        name: 'recordProximity'
                    },
                    arguments: [
                        node.left,
                        { type: 'Literal', value: node.operator },
                        node.right
                    ]
                };
            } else if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
                if (node.body.type === 'BlockStatement') {
                    node.body.body.unshift(createRecordLocationStatement());
                } else {
                    // *Expression
                    node.body = {
                        type: 'SequenceExpression',
                        expressions: [
                            createRecordLocationExpression(),
                            node.body
                        ]
                    };
                }
            } else if (node.type === 'IfStatement') {
                if (node.consequent.type !== 'BlockStatement') {
                    node.consequent = {
                        type: 'BlockStatement',
                        body: [
                            node.consequent
                        ]
                    };
                }
                node.consequent.body.unshift(createRecordLocationStatement());
                if (node.alternate) {
                    if (node.alternate.type !== 'BlockStatement') {
                        node.alternate = {
                            type: 'BlockStatement',
                            body: [
                                node.alternate
                            ]
                        };
                    }
                } else {
                    node.alternate = {
                        type: 'BlockStatement',
                        body: []
                    };
                }
                node.alternate.body.unshift(createRecordLocationStatement());
            } else if (node.type === 'WhileStatement' || node.type === 'DoWhileStatement' || node.type === 'ForStatement' || node.type === 'ForInStatement' || node.type === 'ForOfStatement') {
                if (node.body.type === 'EmptyStatement') {
                    node.body = {
                        type: 'BlockStatement',
                        body: []
                    };
                } else if (node.body.type !== 'BlockStatement') {
                    node.body = {
                        type: 'BlockStatement',
                        body: [
                            node.body
                        ]
                    };
                }
                node.body.body.unshift(createRecordLocationStatement());
            } else if (node.type === 'TryStatement') {
                if (node.handler) {
                    node.handler.body.body.unshift(createRecordLocationStatement());
                }
            } else if (node.type === 'SwitchStatement') {
                for (const switchCaseNode of node.cases) {
                    switchCaseNode.consequent.unshift(createRecordLocationStatement());
                }
            } else if (node.type === 'ConditionalExpression') {
                node.consequent = {
                    type: 'SequenceExpression',
                    expressions: [
                        createRecordLocationExpression(),
                        node.consequent
                    ]
                };
                node.alternate = {
                    type: 'SequenceExpression',
                    expressions: [
                        createRecordLocationExpression(),
                        node.alternate
                    ]
                };
            } else if (node.type === 'LogicalExpression' || node.type === 'AssignmentPattern') {
                node.right = {
                    type: 'SequenceExpression',
                    expressions: [
                        createRecordLocationExpression(),
                        node.right
                    ]
                };
            }
        }
    });
    return { instrumentedAst: ast, magicValues };
}

module.exports = instrumentAst;
