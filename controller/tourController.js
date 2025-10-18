const fs = require('fs');

// DATA
const tours = JSON.parse(fs.readFileSync(`${__dirname}/../data/data.json`));

exports.checkID = (req, res, next, val) => {
    if (val > tours.length) {
        return res.status(404).json({
            status: "Fail",
            message: "Invalid ID",
        });
    }
    next();
}

exports.checkBody = (req, res, next) => {
    if (!req.body.name || !req.body.price) {
        return res.status(400).json({
            status: "Bad request",
            message: "Name or price is not available",
        });
    }
    next();
}

// Tour route handler 
exports.getAllTour = (req, res) => {
    res.status(200).json({
        status: "200",
        requestedAt: req.requestedAt,
        mesage: "Orders successfully retrived",
        total: tours.length,
        data: {
            tours: tours,
        }
    }
    );
}

exports.getTour = (req, res) => {
    const id = req.params.id * 1;



    const tour = tours.find(el => el.id === id);

    res.status(200).json({
        status: "200",
        requestedAt: req.requestedAt,
        mesage: "Orders successfully retrived",
        data: {
            tours: tour,
        }
    }
    );
}

exports.createTour = (req, res) => {
  
}

exports.updateTour = (req, res) => {
    if (req.params.id * 1 > tours.length) {
        res.status(404).json({
            status: "Fail",
            message: "Invalid ID",
        });
    }

    res.status(200).json({
        status: "200",
        data: {
            tour: "<Update a tour>",
        }
    })
}

exports.deleteTour = (req, res) => {
    if (req.params.id * 1 > tours.length) {
        res.status(404).json({
            status: "Fail",
            message: "Invalid ID",
        });
    }

    res.status(204).json({
        status: "200",
        data: null,
    })
}
