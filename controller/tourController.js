const fs = require('fs');
const Tour = require('./../model/tourModel');

// Tour route handler
exports.getAllTour = async (req, res) => {
    try {
        const queryObj = { ...req.query };
        const execludeFields = ['page', 'sort', 'limit', 'fields'];
        execludeFields.forEach(el => delete queryObj[el]);

        const tours = await Tour.find(queryObj);
        // const tours = await Tour.find().where('duration').equals(12).where('difficulty').equals('easy');

        res.status(200).json({
            status: "200",
            total: tours.length,
            mesage: "Successfully retrived",
            data: {
                tours,
            }
        }
        );
    } catch (err) {
        res.status(400).json({
            status: "400",
            message: "Invalid",
        })
    }
}

exports.getTour = async (req, res) => {
    try {
        const tour = await Tour.findById(req.params.id);
        res.status(200).json({
            status: "200",
            mesage: "Orders successfully retrived",
            data: {
                tour
            }
        }
        );
    } catch (err) {
        res.status(400).json({
            staus: "Fail",
            message: "Error: " + err,
        })
    }
}

exports.createTour = async (req, res) => {
    try {
        const newTour = await Tour.create(req.body);
        res.status(201).json({
            status: "201",
            data: {
                tour: newTour,
            }
        });
    } catch (err) {
        res.status(400).json({
            status: "Fail",
            message: "Invalid sent data",
        });
    }
}

exports.updateTour = async (req, res) => {
    try {
        const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        })
        res.status(200).json({
            status: "200",
            data: {
                tour: tour
            }
        })

    } catch (err) {
        res.status(400).json({
            status: "Fail",
            message: "ERROR: " + err,
        })
    }

}

exports.deleteTour = async (req, res) => {
    try {
        const tour = await Tour.findByIdAndDelete(req.params.id);

        res.status(204).json({
            status: "200",
            data: {
                tour
            },
        })
    } catch (err) {
        res.status(400).json({
            status: "Fail",
            message: "ERROR: " + err,
        })
    }

}
