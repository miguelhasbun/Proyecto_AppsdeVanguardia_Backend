var mongoose= require("mongoose");

//mongoose.connect("mongodb://localhost/ProyectoVanguardia", {useNewUrlParser: true,useUnifiedTopology: true});

mongoose.connect('mongodb+srv://sa:1234@cluster0-pyexl.azure.mongodb.net/test', {useNewUrlParser:true, useUnifiedTopology: true} ).then( ()=> {
    console.log(`La Conexión a Base de Datos: es Correcta!!`);
} );   

const userSchemaJson = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    nombre: {type: String, required: true},
    usuario: {type: String, required: true},
    clave: {type: String, required: true},
    img: {type: String, required: true}
});

module.exports= mongoose.model('users', userSchemaJson);
