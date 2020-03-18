
"use strict";

module.exports = function(app) {
  var welcomecontroller = require("../Controllers/WelcomeController");
  var usercontroller= require("../Controllers/UserController");
  //var facialreconizerservices =require ("../Services/FaceDetection")

  //probando mi controlador de testing
  app.route("/").get(welcomecontroller.welcome);

  //usuarios
  app.route("/users").get(usercontroller.listar_usuarios);
  app.route("/users/delete/:id").delete(usercontroller.borrar_usuarios);
  app.route("/users/get/:id").get(usercontroller.buscar_usuarios);
  app.route("/users/puts/:id").put(usercontroller.modificar_usuarios);

  app.route("/users/register").post(usercontroller.register);
};

