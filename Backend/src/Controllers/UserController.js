"use strict";
var User= require('../Models/UserModel');
const mongoose = require('mongoose');
const Faceapi= require('../Services/FaceDetection');

//listo todos los usuarios
exports.listar_usuarios = async function(req, res){
    try {
        const users = await User.find();
        res.status(200).send(users);
    } catch (error) {
        console.log(error);
        res.status(500).send({message: "Error al traer los usuarios"});
    }
}
//creo un usuario
exports.crear_usuarios= async function(req, res){
    try {
        const user = new User({
            _id: new mongoose.Types.ObjectId,
            nombre: req.body.nombre,
            usuario: req.body.usuario,
            clave: req.body.clave,
            img: req.body.img
        }); 
       const us= await user.save(); 
       console.log(us);
       res.status(200).send({message: "Creado con exito"});
    } catch (error) {
        console.log(error);
        res.status(500).send({message: "Error al crear el usuario"});
    }
    
}
exports.modificar_usuarios= async function(req, res){
    try {
        var ausuarioId= req.params.id;
        var params= req.body;

        //obtengo todos los parámetro
        var validate_nombre = params.nombre;
        var validate_usuario = params.usuario;
        var validate_clave= params.clave;

        if (validate_nombre && validate_usuario && validate_clave){
            const validate= await User.findOneAndUpdate( {_id:ausuarioId}, params, {new:true});
            console.log(validate);
            return res.status(200).send({message: 'Registro actualizado correctamente.'});
        }

    } catch (error) {
        console.log (error);
        return res.status(500).send({message: 'Los datos no son correctos.'});
    }
}

//borro un usuario por id
exports.borrar_usuarios= async function(req, res){
    try {
        const id= req.params.id;
        console.log(id);
        const resp= await User.deleteOne({_id: id});
        console.log(resp);
        res.status(200).send({message: "Eliminado con exito"});
    } catch (error) {
        console.log(error);
        res.status(500).send({message: "Error al eliminar el usuario"});
    }
}
//busco un usuario por id 
exports.buscar_usuarios= async function(req, res){
    try {
        const id= req.params.id;
        const buscado= await User.findById(id);
        if (buscado == null){
            res.status(500).send({message: "usuario no existe"});
        }
        res.status(200).send(buscado);
    } catch (error) {
        console.log(error);
        res.status(500).send({message: "Ocurrió un error mientras se buscaba el usuario"}); 
    }
}

exports.login= function(req,res){
    var imageData,
        clave= req.body.clave
    
    if(!req.body.clave && !req.body.faceID){
        res.statusCode=400;
        res.json({message:'Contraseña o Foto es requerida'});
        return;
    }
    User.findOne({usuario: req.body.usuario}).select('users usuario clave faceID').exec(function(err,user){
        if(err||!user){
            res.statusCode=403;
            res.json({message: 'Usuario no encontrado'});
            return;
        }

        if(clave){
            var validClave= user.clave == clave;
            if (!validClave){
                res.statusCode= 403;
                res.json({message : "Error al iniciar la sesión"});

            }else{
                res.status(500);
            }

        }else{
            if(req.body.image){
                imageData=Buffer.from(req.body.image.split(",")[1],'base64');
            }
            if (imageData){
                Faceapi.faceDetect(imageData, 
                    function(msDetectData){
                        if (msDetectData[0]){
                            Faceapi.faceCompare(user.faceID, msDetectData[0].faceID, function (msCompareData){
                                if (msCompareData.isIdentical && msCompareData.confidence >= config.FACE_API_CONFIDENCE_TRESHOLD){
                                    res.status(500);
                                }else{
                                    res.status(403);
                                }
                            });
                        }
                    })
            }
        }
    })
}

