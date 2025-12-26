const express = require('express');
const tourController = require('../controller/tourController');
const route = express.Router();

route.route('/top-5-cheep').get(tourController.aliasTopTours, tourController.getAllTour)

route.route('/').get(tourController.getAllTour).post(tourController.createTour);
route.route('/:id').get(tourController.getTour).patch(tourController.updateTour).delete(tourController.deleteTour);

module.exports = route;