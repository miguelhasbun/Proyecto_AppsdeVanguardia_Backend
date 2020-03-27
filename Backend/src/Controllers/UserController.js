"use strict";
var User= require('../Models/UserModel');
const mongoose = require('mongoose');
const FaceAPI = require('../Services/FaceDetection');
const config= require('../Services/config');
const jwt =require('jsonwebtoken');

const Encryptation= require('../Utils/Encryptation');


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
    const _usuario  = req.body.usuario;
    const _email    = req.body.email;
    const _clave    = req.body.clave;
    const _image    = req.body.image;
    const _nombre   = req.body.nombre;
    const _apellido = req.body.apellido;
    let _FaceID;

    try {
        const _result=await User.find({$or:[{usuario:_usuario},{email:_email}]});
        console.log("Resultado: "+_result.length)
        if (_result.length){ //si devuelve vacio es que no encontró un usuario o email con esos
            res.status(500).json({message: "Usuario ya existe"});
        }

        //Incriptando Contraseña
        const _clave_encrypt= Encryptation.genPassword(_clave);

        if(!_image){
            res.status(500).json({message:"Imagen Requerida"});
        }

        const imageData=Buffer.from(_image.split(",")[1],'base64');
        if(imageData){
            FaceAPI.faceDetect(imageData,
                async function(msDetectData) {
                    var faceMessage = '';
                    if(msDetectData.length === 1){
                        _FaceID= msDetectData[0].faceId;
                        const user = new User({
                            _id: new mongoose.Types.ObjectId,
                            nombre: _nombre,
                            apellido:_apellido,
                            usuario: _usuario,
                            faceID:_FaceID,
                            clave: _clave_encrypt,  //clave encriptada
                            email: _email
                        });
                        let _user;
                        if(!_result.length)
                            _user= await user.save();

                        jwt.sign({_user},config.KEY_SECRET,(err,token)=>{
                            res.status(200).json({
                                message:"El usuario ha sido creado exitosamente!",
                                token,
                                _user

                            });
                        });

                    }else if(!msDetectData.length){
                        faceMessage = 'No se ha reconocido ningura cara'
                    }else {
                        faceMessage = 'Mas de una cara ha sido reconocida'
                    }
                    if(!_FaceID){
                        res.status(500).json({message:faceMessage});
                    }
                },
                function(error) {
                    console.log(error);
                    res.status(500).json({message:"Error durante el reconocimiento facial"})
                }
            );
        }    
    } catch (error) {
        console.log(error);
    }
}


exports.login= async function(req,res){

    const _usuario  =   req.body.usuario;
    const _clave    =   req.body.clave;
    const _image    =   req.body.image;

    try {
        if(!_usuario){
            res.status(500).json({message:"Porfavor ingrese un usuario"});
        }
        const _result= await User.findOne({usuario:_usuario}).select('users usuario clave faceID');
        if(!_result){
            res.status(500).json({message:"Usuario no encontrado"}); 
        }

        if(!_clave && !_image){
            res.status(500).json({message:"Se requiere una clave o una imagen"});
        }
        if(_clave && _clave!=='undefine'){
            const _validPassword= _result.comparePassword(req.body.clave);//req.body.clave===result.clave;
            if(_validPassword){
                jwt.sign({_result},config.KEY_SECRET,(error,token)=>{
                    res.status(200).json({
                        message:"Iniciando sesion con contraseña",
                        token
                    });
                });
            }else
                res.status(500).json({message:"Usuario o Contraseña no validos"});
        }
        else if(_image) {
            const imageData=Buffer.from(_image.split(",")[1],'base64');
            if(imageData){
                FaceAPI.faceDetect(imageData, 
                    function(msDetectData){
                        if (msDetectData[0]){
                            FaceAPI.faceCompare(_result.faceID, msDetectData[0].faceId,
                                function (msCompareData){
                                    if (msCompareData.isIdentical && msCompareData.confidence >= config.FACE_API_CONFIDENCE_TRESHOLD){
                                        jwt.sign( {_result}, config.KEY_SECRET, (error,token)=>{
                                            res.status(200).json({
                                                message:"Iniciando sesion con reconocimiento facial",
                                                token
                                            });
                                        });
                                       // res.status(200).json({message:"Iniciando sesion con reconocimiento facial"});
                                    }else{
                                        res.status(403).json({message:"No se pudo iniciar sesion con reconocimiento facial"});
                                    }
                                },function(error){
                                    console.log(error);
                                    res.status(500).json({message:"Hubo un error al momento de iniciar sesion"});
                                }
                            );
                        }
                    },
                    function(error){
                        console.log(error);
                        res.status(500).json({message:"Hubo un error al momento de iniciar sesion"});
                    }
                );
            }
        }else{
            res.status(500).json({message:"No ha sido detectada ninguna imagen"});
        }
        
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Error al momento de loggear"});
    }

}

