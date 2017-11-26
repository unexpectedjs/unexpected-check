module.exports =  (input) => {
    var i = -1;

    if ((i = input.indexOf('se', i)) !== -1) {
        if ((i = input.indexOf('cr', i)) !== -1) {
            if ((i = input.indexOf('et', i)) !== -1) {
                throw new Error('BOOM!!!');
            }
        }
    }
};
