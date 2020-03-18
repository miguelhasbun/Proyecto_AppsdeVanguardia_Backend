const bcrypt = require ('bcrypt');

function genPassword(pass){
    if (!pass || pass.length ==0){
        throw Error("Necesita una contraseña");
    }
    return bcrypt.hashSync(pass, 10); 
}

module.exports.genPassword = genPassword;