// // Freight Owner schema. 
const freightOwnerSchema = new mongoose.Schema({
  companyName: String,

  businessLicense: String,

  address: {
    city: String,
    regionState: String,
    country: String,
  },
});

const FreightOwner = User.discriminator("freight_owner", freightOwnerSchema);
