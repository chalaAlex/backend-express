const express = require('express');
const tourController = require('../controller/tourController');
const route = express.Router();

route.route('/').get(tourController.getAllTour).post(tourController.createTour);
route.route('/:id').get(tourController.getTour).patch(tourController.updateTour).delete(tourController.deleteTour);

module.exports = route;