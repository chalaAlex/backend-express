const express = require('express');
const tourController = require('../controller/tourController');
const route = express.Router();

route.param('id', tourController.checkID);

route.route('/').get(tourController.getAllTour).post(tourController.checkBody, tourController.createTour);
route.route('/:id').get(tourController.getTour).patch(tourController.updateTour).delete(tourController.deleteTour);

module.exports = route;