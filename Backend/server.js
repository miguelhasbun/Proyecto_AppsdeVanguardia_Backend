
const express = require("express");
const port = 3000;
const app= express();
const morgan= require("morgan");
const bodyParser = require("body-parser");
const routes= require("./src/Routes/Routes");

app.use(morgan("dev"));

app.listen(port, () => {
    console.log("listen on port... ", port);
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    routes(app);
});

