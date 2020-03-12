'use strict';

//const request = require('request');
var express = require('express');
var app = express();
var fs = require('fs');
var http = require('http');
var https = require('https');
var mongoose = require('mongoose');
var jwt = require('jsonwebtoken');
var config = require('./config');
var bodyParser = require('body-parser');

/*
// Replace <Subscription Key> with your valid subscription key.
const subscriptionKey = '<Subscription Key>';
//Replace <My Endpoint String> with your endpoint.
const endpoint ='<My Endpoint String>';

// You must use the same location in your REST call as you used to get your
// subscription keys. For example, if you got your subscription keys from
// westus, replace "westcentralus" in the URL below with "westus".

const uriBase = `https://${endpoint}.com/face/v1.0/detect`;
const imageUrl ='https://upload.wikimedia.org/wikipedia/commons/3/37/Dagestani_man_and_woman.jpg';

*/
// MS API FUNCTIONS
/**
 * Call MS face detection
 * 
 * @param {*} imageData image as dataURL
 * @param {*} onSuccess success callback
 * @param {*} onError error callback
 */
function callMsDetect(imageData, onSuccess, onError) {
    var msDetectOptions = {
        host: config.FACE_API_HOST,
        method: 'POST',
        port: 443,
        path: config.FACE_API_PATH_DETECT,
        headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Length': Buffer.byteLength(imageData),
            'Ocp-Apim-Subscription-Key': config.FACE_API_KEY
        }
    };

    var msDetectReq = https.request(msDetectOptions, function(msDetectResponse) {
        msDetectResponse.setEncoding('utf8');
        msDetectResponse.on('data', function(msDetectData){
            onSuccess(JSON.parse(msDetectData));
        });
    });

    msDetectReq.on('error', onError);
    msDetectReq.write(imageData);
    msDetectReq.end();
}

/**
 * 
 * @param {*} faceId1 face1 to compare
 * @param {*} faceId2 face2 to compare
 * @param {*} onSuccess success callback
 * @param {*} onError error callback
 */
function callMsCompare(faceId1, faceId2, onSuccess, onError) {
    var msVerifyOptions = {
        host: config.FACE_API_HOST,
        method: 'POST',
        port: 443,
        path: config.FACE_API_PATH_VERIFY,
        headers: {
            'Ocp-Apim-Subscription-Key': config.FACE_API_KEY
        }
    }

    var msVerifyReq = https.request(msVerifyOptions, function(msVerifyResponse) {
        msVerifyResponse.setEncoding('utf8');
        msVerifyResponse.on('data', function(msVerifyData) {
            onSuccess(JSON.parse(msVerifyData));
        });
    })

    msVerifyReq.on('error', onError);
    msVerifyReq.write(JSON.stringify({faceId1: faceId1, faceId2: faceId2}));
    msVerifyReq.end();
}

// PUBLIC API ENDPOINTS

// login endpoint
app.post('/login', function(req, res){
    // possible login methods: image or password
    var imageData, 
        password = req.body.password;

    // if neither password nor image is sent, send 400;    
    if(!req.body.password && !req.body.image) {
        res.statusCode = 400;
        res.json({'message': 'Either image or password is required'});
        return;
    }    

    // select user from database    
    User.findOne({
		username: req.body.username
	}).select('user username faceId password').exec(function(err, user){
        if(err || !user){
            res.statusCode = 403;
            res.json({message:'user not found'});
            return;
        }
        // password login
        if(password) {

            // check password
            var validPassword = user.comparePassword(password);
            if(!validPassword){
                // if password does not match, send 403
                res.statusCode = 403;
                res.json({message: 'Authentication failed. Wrong username / password.'});
            }
            else {
                // if user is found and password is right, create a token
                var token = jwt.sign({
                    username: user.username
                }, config.SECRET);

                // send the token
                res.json({
                    message: 'Enjoy your token!',
                    token:token
                });
            } 
        }
        else {
            // get image as binary data, so it can be sent to MS
            if(req.body.image) {
                imageData = Buffer.from(req.body.image.split(",")[1], 'base64');
            }
            // image login
            if (imageData) {
                // detect faces on the login image
                callMsDetect(imageData, 
                    function(msDetectData) {
                        // check for the first face
                        // TODO: send error when more than one face is recognized and let the user pick one
                        if(msDetectData[0]){
                            // compare the recognized face to the saved one  
                            callMsCompare(user.faceId, msDetectData[0].faceId, 
                                function(msCompareData){
                                    if(msCompareData.isIdentical && msCompareData.confidence >= config.FACE_API_CONFIDENCE_TRESHOLD){
                                        //if faces match, create a token
                                        var token = jwt.sign({
                                            username: user.username
                                        }, config.SECRET);

                                        //return the information including token as JSON
                                        res.json({
                                            message: 'Login succesful',
                                            token:token
                                        });
                                    }
                                    else {
                                        // if faces do not match, send 403
                                        res.statusCode = 403;
                                        res.json({'message': 'image login failed - face could not be verified'});
                                    }
                                },
                                function(error){
                                    // if an error occurs during the compare, send 500
                                    res.statusCode = 500;
                                    res.json({'message': 'image login failed - face compare failed'});
                                });
                        }
                        else {
                            // if no face can be recognized on the login image, send 400
                            res.statusCode = 400;
                            res.json({'message': 'image login failed - no face recognized'});
                        }
                    },
                    function(error) {
                        // if an error occurs during the detection, send 500
                        res.statusCode = 500;
                        res.json({'message':'image login failed - face detection failed'});
                    });
            }
            else {
                // if neither password nor valid image data is given, send error
                res.statusCode = 400;
                res.json({message: 'Either password or image is required'});
            }
        }
    })
});