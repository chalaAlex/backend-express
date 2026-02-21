const mongoose = require("mongoose");
const { calculateDistanceBetweenCities } = require("../utils/distanceHelper");

const CargoSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    weightKg: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
    },
  },
  {
    _id: false,
  },
);

const LocationSchema = new mongoose.Schema(
  {
    city: {
      type: String,
      required: true,
    },
    address: {
      type: String,
    },
  },
  {
    _id: false,
  },
);

const RouteSchema = new mongoose.Schema(
  {
    pickup: {
      type: LocationSchema,
      required: true,
    },
    dropoff: {
      type: LocationSchema,
      required: true,
    },
    distanceKm: {
      type: Number,
    },
  },
  {
    _id: false,
  },
);

const ScheduleSchema = new mongoose.Schema(
  {
    pickupDate: {
      type: Date,
      required: true,
    },
    deliveryDeadline: {
      type: Date,
    },
  },
  {
    _id: false,
  },
);

const TruckRequirementSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["FLATBED", "BOX", "REFRIGERATED", "TANKER", "LOWBED"],
      required: true,
    },
    minCapacityKg: { type: Number, required: true },
  },
  { _id: false },
);

const PricingSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["FIXED", "BID"],
      required: true,
    },
    amount: { type: Number },
  },
  { _id: false },
);

const FreightSchema = new mongoose.Schema(
  {
    freightOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    cargo: { type: CargoSchema, required: true },

    route: { type: RouteSchema, required: true },

    schedule: { type: ScheduleSchema, required: true },

    truckRequirement: {
      type: TruckRequirementSchema,
      required: true,
    },

    pricing: { type: PricingSchema, required: true },

    status: {
      type: String,
      enum: ["OPEN", "BIDDING", "BOOKED", "COMPLETED", "CANCELLED"],
      default: "OPEN",
    },
    bidCount: {
      type: Number,
      default: 0,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // auto creates createdAt & updatedAt
    toJSON: {
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  },
);

FreightSchema.virtual("bids", {
  ref: "Bids",
  foreignField: "freightId",
  localField: "_id",
});

FreightSchema.pre("save", async function (next) {
  if (
    this.isModified("route.pickup.city") ||
    this.isModified("route.dropoff.city")
  ) {
    const distance = await calculateDistanceBetweenCities(
      this.route.pickup.city,
      this.route.dropoff.city,
    );
    this.route.distanceKm = distance ? parseFloat(distance.toFixed(2)) : null;
  }
  next();
});

module.exports = mongoose.model("Freight", FreightSchema);
