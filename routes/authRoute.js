const express = require('express');
const authController = require('../controller/authController');
const route = express.Router();

// route.route('/').get(authController.getAllTour).post(authController.login);
// route.route('/:id').get(authController.getTour).patch(authController.updateTour).delete(authController.deleteTour);

route.route("/").post(authController.login);
route.route("/").get(authController.login);
route.route("/").get(authController.login);
route.route("/").get(authController.login);


module.exports = route;