var mongoose= require("mongoose");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); 


//mongoose.connect("mongodb://localhost/ProyectoVanguardia", {useNewUrlParser: true,useUnifiedTopology: true});


mongoose.connect('mongodb+srv://sa:1234@cluster0-pyexl.azure.mongodb.net/test', {useNewUrlParser:true, useUnifiedTopology: true} ).then( ()=> {
    console.log(`La Conexión a Base de Datos: es Correcta!!`);
} );   


const userSchemaJson = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    nombre: {type: String, required: true},
    apellido: {type: String, required: true},
    usuario: {type: String, required: true},
    clave: {type: String, required: true},
    faceID: {type: String, required: true},
    email: {type: String, required: true}
});
/*
//antes de guardar el usuario encripta la contraseña
userSchemaJson.pre('save', function(next){
    var user= this;

    if (!user.isModified('clave')) return next();

*/
module.exports= mongoose.model('user', userSchemaJson);
