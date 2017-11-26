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
