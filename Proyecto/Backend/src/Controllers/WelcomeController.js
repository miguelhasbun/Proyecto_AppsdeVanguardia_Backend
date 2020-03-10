"use strict";

exports.welcome= function(req, res){
    res.status(200).json({message: "Welcome to my API"});
}