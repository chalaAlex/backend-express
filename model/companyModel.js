const mongoose = require("mongoose");
const { Schema, model, Types } = mongoose;

const companyModel = new Schema({
  primaryContactNumber: {
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

  isActive: {
    type: Boolean,
    default: true,
  },

  isVerified: {
    type: Boolean,
    default: false,
  },

  isFeatured: {
    type: Boolean,
  },

  timestamps: true,
});

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

module.exports = model("Company", companyModel);