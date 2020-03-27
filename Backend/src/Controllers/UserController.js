"use strict";
var User= require('../Models/UserModel');
const mongoose = require('mongoose');

const Encryptation= require('../Utils/Encryptation');
const FaceAPI = require('../Services/FaceDetection');
const config= require('../Services/config');


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


exports.register= async function(req, res){
    //validando el usuario único y correo único
    const usertemp= req.body.usuario;
    const emailtemp= req.body.email;
    let _FaceID;
    try {
        const respuestausuario= await User.find({usuario:  usertemp});
        const respuestaemail= await User.find({email: emailtemp});
        if (respuestausuario.length !== 0 || respuestaemail.length !==0){ //si devuelve vacio es que no encontró un usuario o email con esos
            res.status(500).json({message: "usuario ya existe"});
        }
        
        const enc= Encryptation.genPassword(req.body.clave);

        if(!req.body.image){
            res.status(500).json({message:"Imagen Requerida"});
        }

        const imageData=Buffer.from(req.body.image.split(",")[1],'base64');
        if(imageData){
            FaceAPI.faceDetect(imageData,
                async function(msDetectData) {
                    var faceMessage = '';
                    if(msDetectData.length === 1){
                        _FaceID= msDetectData[0].faceId;
                        const user = new User({
                            _id: new mongoose.Types.ObjectId,
                            nombre: req.body.nombre,
                            apellido: req.body.apellido,
                            usuario: req.body.usuario,
                            faceID:_FaceID,
                            clave: enc,  //clave encriptada
                            email: req.body.email
                        });
                        const us= await user.save(); 
                        res.status(200).send({message: `Creado con exito\n ${us}`});

                    }else if(!msDetectData.length){
                        faceMessage = 'No face was recognized.'
                    }else {
                        faceMessage = 'More than one face was recognized.'
                    }
                    if(!_FaceID){
                        res.status(500).json({message:faceMessage});
                    }
                },
                function(error) {
                    // if an error occurs during face detection, inform user 
                    // the account will be created without any faceId anyways
                    res.status(500).json({message:"Error durante el reconocimiento facial"})
                }
            );
        }
       
     /*   if(req.body.image) {
            // call face detection
            FaceAPI.faceDetect(Buffer.from(req.body.image.split(",")[1], 'base64'),
                function(msDetectData) {
                    var faceMessage = '';
                    // face will only be saved if only one face is recognized
                    // if no face or more than one face is recognized, the user will be informed
                    // the account will be created without any faceId anyways
                    if(msDetectData.length === 1){
                        user.faceID = msDetectData[0].faceId;
                        Console.log(user.faceID);
                    }
                    else if(!msDetectData.length){
                        faceMessage = 'No face was recognized.'
                    }
                    else {
                        faceMessage = 'More than one face was recognized.'
                    }
                 
                },
                function(error) {
                    // if an error occurs during face detection, inform user 
                    // the account will be created without any faceId anyways
                    user.save(function(error){
                        var faceMessage = 'Face recognition failed';
                        if(error) {
                            // if an error occurs during save, send 500
                            res.statusCode = 500;
                            res.json({message:JSON.stringify(error)});
                            return;
                        }
                    });
                });
        }*/
    
       
        
    } catch (error) {
        console.log(error);
    }
}


exports.login= async function(req,res){
    try {
        if(!req.body.user){
            res.status(500).json({message:"Porfavor ingrese un usuario"});
        }
        const result= await User.findOne({usuario:req.body.user}).select('users usuario clave faceID');
        if(!result){
            res.status(500).json({message:"Usuario no encontrado"}); 
        }

        if(!req.body.clave && !req.body.image){
            res.status(500).json({message:"Se requiere una clave o una imagen"});
        }
        if(req.body.clave){
            const validPassword= req.body.clave===result.clave;
            if(validPassword)
                res.status(200).json({message:"Inicio de sesion exitosamente"}); 
            else
                res.status(500).json({message:"Credenciales no aceptadas"});
        }
        else if(req.body.image) {
            const imageData=Buffer.from(req.body.image.split(",")[1],'base64');
            if(imageData){
                console.log("Llamando a face detect");
                FaceAPI.faceDetect(imageData, 
                    function(msDetectData){
                        console.log("dentro ms msDetectData");
                        if (msDetectData[0]){
                            console.log("Llamando a faceCompare");
                            FaceAPI.faceCompare(result.faceID, msDetectData[0].faceId,
                                function (msCompareData){
                                    console.log("Dentro de face compare");
                                    if (msCompareData.isIdentical && msCompareData.confidence >= config.FACE_API_CONFIDENCE_TRESHOLD){
                                        res.status(200).json({message:"Iniciando sesion con reconocimiento facial"});
                                    }else{
                                        res.status(403).json({message:"No se pudo iniciar sesion con reconocimiento facial"});
                                }
                            },function(error){
                                console.log(error);
                                res.status(500).json({message:"Hubo un error al momento de iniciar sesion"});
                            });
                    }
                    },
                    function(error){
                        console.log(error);
                        res.status(500).json({message:"Hubo un error al momento de iniciar sesion"});
                    });

            }
        }else{
            res.status(500).json({message:"No ha sido detectada ninguna imagen"});
        }
        
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Error al momento de loggear"});
    }
/*        clave= req.body.clave
    
    if(!req.body.clave ){
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
                return;

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
                                    return;
                                }
                            });
                        }
                    })
            }
        }
        
    })*/
}

