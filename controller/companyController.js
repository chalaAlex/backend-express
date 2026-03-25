const Company = require("../model/companyModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");
const { Types } = require("mongoose");

exports.getAllCompany = catchAsync(async (req, res) => {
  const features = new APIFeatures(Company.find(), req.query)
    .filter()
    .sort()
    .paginate();

  const companies = await features.query;

  res.status(200).json({
    statusCode: 200,
    message: "Successfully retrieved all companies",
    total: companies.length,
    data: {
      companies,
    },
  });
});

exports.registerCompany = catchAsync(async (req, res, next) => {
  if (
    req.body.primaryContactPerson &&
    !Types.ObjectId.isValid(req.body.primaryContactPerson)
  ) {
    return next(new AppError("Invalid primaryContactPerson id", 400));
  }

  const companyData = { ...req.body };
  if (!companyData.primaryContactPerson && req.user?._id) {
    companyData.primaryContactPerson = req.user._id;
  }

  try {
    const company = await Company.create(companyData);

    res.status(201).json({
      statusCode: 201,
      message: "Company registered successfully",
      data: {
        company,
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateField = Object.keys(error.keyValue || {})[0] || "field";
      return next(new AppError(`${duplicateField} already exists`, 400));
    }
    return next(error);
  }
});

exports.getCompany = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!Types.ObjectId.isValid(id)) {
    return next(new AppError("Invalid company id", 400));
  }

  const company = await Company.findById(id)
    .populate("primaryContactPerson", "firstName lastName phone email");

  if (!company) {
    return next(new AppError("Company not found", 404));
  }

  res.status(200).json({
    statusCode: 200,
    message: "Company retrieved successfully",
    data: {
      company,
    },
  });
});

exports.updateCompany = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!Types.ObjectId.isValid(id)) {
    return next(new AppError("Invalid company id", 400));
  }

  if (
    req.body.primaryContactPerson &&
    !Types.ObjectId.isValid(req.body.primaryContactPerson)
  ) {
    return next(new AppError("Invalid primaryContactPerson id", 400));
  }

  try {
    const company = await Company.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    }).populate("primaryContactPerson", "firstName lastName phone email");

    if (!company) {
      return next(new AppError("Company not found", 404));
    }

    res.status(200).json({
      statusCode: 200,
      message: "Company updated successfully",
      data: {
        company,
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateField = Object.keys(error.keyValue || {})[0] || "field";
      return next(new AppError(`${duplicateField} already exists`, 400));
    }
    return next(error);
  }
});

exports.deleteCompany = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!Types.ObjectId.isValid(id)) {
    return next(new AppError("Invalid company id", 400));
  }

  const company = await Company.findByIdAndDelete(id);

  if (!company) {
    return next(new AppError("Company not found", 404));
  }

  res.status(204).json({
    statusCode: 204,
    message: "Company deleted successfully",
    data: null,
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
            { $multiply: [{ $ifNull: ["$ratingAverage", 0] }, 3] },
            {
              $log: [{ $add: [{ $ifNull: ["$completedShipments", 0] }, 1] }, 10],
            },
            { $multiply: [{ $ifNull: ["$fleetSize", 0] }, 0.5] },
            { $cond: ["$isVerified", 5, 0] },
          ],
        },
      },
    },
    { $sort: { score: -1 } },
    { $limit: 10 },
  ]);

  res.status(200).json({
    statusCode: 200,
    message: "Recommended companies retrived successfully",
    total: companies.length,
    data: { companies },
  });
});

exports.getTopRatedCompanies = catchAsync(async (req, res) => {
  const companies = await Company.find({ isActive: true })
    .sort({
      ratingAverage: -1,
      ratingQuantity: -1,
      completedShipments: -1,
    })
    .limit(10);

  res.status(200).json({
    statusCode: 200,
    message: "Top rtaed companies successfuly retrieved",
    total: companies.length,
    data: { companies },
  });
});

exports.getCompanyCarriers = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!Types.ObjectId.isValid(id)) {
    return next(new AppError("Invalid company id", 400));
  }

  const company = await Company.findById(id)
    .populate({
      path: "carrier",
      populate: {
        path: "truckOwner",
        select: "firstName lastName phone ratingQuantity ratingAverage"
      }
    })
    .select("legalEntityName carrier fleetSize");

  if (!company) {
    return next(new AppError("Company not found", 404));
  }

  res.status(200).json({
    statusCode: 200,
    message: "Company carriers retrieved successfully",
    total: company.carrier.length,
    data: {
      company: {
        _id: company._id,
        legalEntityName: company.legalEntityName,
        fleetSize: company.fleetSize
      },
      carriers: company.carrier,
    },
  });
});

