const fs = require("fs");
const Tour = require("./../model/tourModel");
const { match } = require("assert");
const APIFeatures = require('./../utils/apiFeatures');

// Tour route handler
exports.aliasTopTours = (req, res, next) => {
  (req.query.limit = "3"),
    (req.query.page = "2"),
    (req.query.sort = "-ratingAverage, price"),
    (req.query.fields =
      "name, price, ratingAverage, summary, difficult, duration"),
    next();
};

exports.getAllTour = async (req, res) => {
  try {
    const feature = new APIFeatures(Tour.find(), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate(); // Method Chaining

    const tours = await feature.query;

    res.status(200).json({
      status: "200",
      total: tours.length,
      mesage: "Successfully retrived",
      data: tours,
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({
      status: "400",
      message: "Invalid",
    });
  }
};

exports.getTour = async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id);
    res.status(200).json({
      status: "200",
      mesage: "Orders successfully retrived",
      data: {
        tour,
      },
    });
  } catch (err) {
    res.status(400).json({
      staus: "Fail",
      message: "Error: " + err,
    });
  }
};

exports.createTour = async (req, res) => {
  try {
    const newTour = await Tour.create(req.body);
    res.status(201).json({
      status: "201",
      data: {
        tour: newTour,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: "Fail",
      message: "Invalid sent data",
    });
  }
};

exports.updateTour = async (req, res) => {
  try {
    const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.status(200).json({
      status: "200",
      data: {
        tour: tour,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: "Fail",
      message: "ERROR: " + err,
    });
  }
};

exports.deleteTour = async (req, res) => {
  try {
    const tour = await Tour.findByIdAndDelete(req.params.id);

    res.status(204).json({
      status: "200",
      data: {
        tour,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: "Fail",
      message: "ERROR: " + err,
    });
  }
};
