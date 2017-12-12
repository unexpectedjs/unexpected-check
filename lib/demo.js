module.exports = {
    findTheSecret(input) {
        var i = -1;

        if ((i = input.indexOf('se', i)) !== -1) {
            if ((i = input.indexOf('cr', i)) !== -1) {
                if ((i = input.indexOf('et', i)) !== -1) {
                    throw new Error('BOOM!!!');
                }
            }
        }
    },
    findTheHardestSecret(input) {
        var i = -1;

        if ((i = input.indexOf('s')) !== -1) {
            if (input[i + 1] === 'e') {
                if (input[i + 2] === 'c') {
                    if (input[i + 3] === 'r') {
                        if (input[i + 4] === 'e') {
                            if (input[i + 5] === 't') {
                                throw new Error('BOOM!!!');
                            }
                        }
                    }
                }
            }
        }
    },
    findExactlySecret(input) {
        if (input[0] === 's') {
            if (input[1] === 'e') {
                if (input[2] === 'c') {
                    if (input[3] === 'r') {
                        if (input[4] === 'e') {
                            if (input[5] === 't') {
                                throw new Error('BOOM!!!');
                            }
                        }
                    }
                }
            }
        }
    },
    findTheMagicNumbers(a, b, c) {
        if (a === 6) {
            if (b === 6) {
                if (c === 6) {
                    throw new Error('BOOM!!!');
                }
            }
        }
    }
};
