const express = require('express');
const route = express.Router();
const internController = require('../controller/internController');

route.route('/').get(internController.getAllIntern).post(internController.createIntern);
route.route('/:id').get(internController.getIntern).patch(internController.updateIntern).delete(internController.deleteIntern);

module.exports = route;
