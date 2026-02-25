const express = require('express');
const authController = require('../controller/authController');
const route = express.Router();

route.route("/").post(authController.signup);
route.route("/").post(authController.login);

module.exports = route;