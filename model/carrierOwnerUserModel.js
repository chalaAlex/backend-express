const carrierOwnerSchema = new mongoose.Schema({

  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company"
  },

  fleetSize: Number,

  licenseNumber: String

});

const CarrierOwner = User.discriminator(
  "carrier_owner",
  carrierOwnerSchema
);