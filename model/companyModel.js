const mongoose = require("mongoose");
const { Schema, model, Types } = mongoose;

const HeadOfficeAddressSchema = new mongoose.Schema({
  city: {
    type: String,
    required: true,
  },
  regionState: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    default: "Ethiopia",
  },
});

const companyModel = new Schema(
  {
    primaryContactPerson: {
      type: Types.ObjectId,
      ref: "User",
    },

    legalEntityName: {
      type: String,
      required: true,
    },

    companyType: {
      type: String,
      required: true,
    },

    companyRegistrationNumber: {
      type: String,
      required: true,
    },

    headOfficeAddress: {
      type: HeadOfficeAddressSchema,
      required: true,
    },

    website: {
      type: String,
    },

    email: {
      type: String,
      unique: true,
    },

    phone: {
      type: String,
      unique: true,
    },

    experience: {
      type: Number,
      required: true,
    },

    ratingAverage: {
      type: Number,
      default: 4.5,
    },

    bannerImage: {
      type: String,
    },

    logo: {
      type: String,
    },

    ratingQuantity: {
      type: Number,
      default: 0,
    },

    completedShipments: {
      type: Number,
      default: 0,
    },

    fleetSize: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    lastActiveAt: {
      type: Date,
      default: Date.now,
    },

    isFeatured: {
      type: Boolean,
    },

    isFavourite: {
      type: Boolean,
    },
  },
  { timestamps: true },
);

module.exports = model("Company", companyModel);
