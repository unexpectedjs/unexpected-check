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

    estraverse.traverse(ast, {
        enter(node) {
            if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
                node.body.body.unshift(createRecordLocationStatement());
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
            } else if (node.type === 'LogicalExpression') {
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
    return ast;
}

module.exports = instrumentAst;
