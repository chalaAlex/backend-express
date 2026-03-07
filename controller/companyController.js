const Company = require("../model/companyModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");
const { Types } = require("mongoose");

exports.getAllCompany = catchAsync(async (req, res) => {
  res.status(200).json({
    statusCode: 200,
    message: "getAll company controller is not implmented yet",
    total: bids.length,
    data: bids,
  });
});

exports.registerCompany = catchAsync(async (req, res, next) => {
  res.status(201).json({
    statusCode: 201,
    message: "Create company controller is not implmented yet",
    data: {},
  });
});

exports.getCompany = catchAsync(async (req, res, next) => {
  res.status(201).json({
    statusCode: 200,
    message: "get company company controller is not implmented yet",
    data: {},
  });
});

exports.updateCompany = catchAsync(async (req, res, next) => {
  res.status(201).json({
    statusCode: 201,
    message: "updateCompany company controller is not implmented yet",
    data: {},
  });
});

exports.deleteCompany = catchAsync(async (req, res, next) => {
  res.status(201).json({
    statusCode: 204,
    message: "deleteCompany company controller is not implmented yet",
    data: {},
  });
});

exports.getFeaturedCompany = catchAsync(async (req, res) => {
  const featuredCompany = Company.find({ isFeatured: true });

  res.status(200).json({
    statusCode: 200,
    message: "Featured company fetched successfully",
    data: {
      featuredCompany,
    },
  });
});

exports.getRecommendedCompanies = catchAsync(async (req, res) => {
  const companies = await Company.aggregate([
    {
      $addFields: {
        score: {
          $add: [
            { $multiply: ["$ratingAverage", 3] },

            {
              $log: [{ $add: ["$completedShipments", 1] }, 10],
            },

            { $multiply: ["$fleetSize", 0.5] },

            { $cond: ["$verified", 5, 0] },
          ],
        },
      },
    },
    { $sort: { score: -1 } },
    { $limit: 10 },
  ]);

  res.status(200).json({
    status: "success",
    results: companies.length,
    data: { companies },
  });
});

// exports.getRecommendedCompanies = catchAsync(async (req, res) => {
//   const companies = await Company.find()
//   .sort({
//     verified: -1,
//     ratingAverage: -1,
//     completedShipments: -1
//   })
//   .limit(10);

//   res.status(200).json({
//     status: "success",
//     results: companies.length,
//     data: { companies },
//   });
// });
