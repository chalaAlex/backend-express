const mongoose = require("mongoose");
const { Schema, model, Types } = mongoose;

const ReviewSchema = new Schema(
  {
    reviewerId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },

    shipmentRequestId: {
      type: Types.ObjectId,
      ref: "ShipmentRequest",
      required: true,
    },

    // Polymorphic target — either a carrier_owner (User) or a company (Company)
    targetId: {
      type: Types.ObjectId,
      required: true,
    },

    targetType: {
      type: String,
      enum: ["carrier_owner", "company"],
      required: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer rating",
      },
    },

    comment: {
      type: String,
      trim: true,
      maxlength: 100,
    },
  },
  { timestamps: true },
);

// One review per freight owner per shipment request
ReviewSchema.index({ reviewerId: 1, shipmentRequestId: 1 }, { unique: true });

/* =========================
   🔥 CALCULATE AVERAGE
========================= */

ReviewSchema.statics.calcAverageRatings = async function (targetId, targetType) {
  const stats = await this.aggregate([
    { $match: { targetId: targetId, targetType: targetType } },
    {
      $group: {
        _id: "$targetId",
        ratingQuantity: { $sum: 1 },
        ratingAverage: { $avg: "$rating" },
      },
    },
  ]);

  if (targetType === "carrier_owner") {
    const User = mongoose.model("User");
    if (stats.length > 0) {
      await User.findByIdAndUpdate(targetId, {
        ratingQuantity: stats[0].ratingQuantity,
        ratingAverage: stats[0].ratingAverage,
      });
    } else {
      await User.findByIdAndUpdate(targetId, {
        ratingQuantity: 0,
        ratingAverage: 4.5,
      });
    }
  } else if (targetType === "company") {
    const Company = mongoose.model("Company");
    if (stats.length > 0) {
      await Company.findByIdAndUpdate(targetId, {
        ratingQuantity: stats[0].ratingQuantity,
        ratingAverage: stats[0].ratingAverage,
      });
    } else {
      await Company.findByIdAndUpdate(targetId, {
        ratingQuantity: 0,
        ratingAverage: 4.5,
      });
    }
  }
};

/* =========================
   ➕ AFTER CREATE
========================= */

ReviewSchema.post("save", async function () {
  this.constructor.calcAverageRatings(this.targetId, this.targetType);

  // Push review reference into the target's review array
  if (this.targetType === "company") {
    const Company = mongoose.model("Company");
    await Company.findByIdAndUpdate(this.targetId, {
      $addToSet: { review: this._id },
    });
  } else if (this.targetType === "carrier_owner") {
    const User = mongoose.model("User");
    await User.findByIdAndUpdate(this.targetId, {
      $addToSet: { review: this._id },
    });
  }
});

/* =========================
   ✏️ AFTER UPDATE / ❌ DELETE
========================= */

ReviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.findOne();
  next();
});

ReviewSchema.post(/^findOneAnd/, async function () {
  if (this.r) {
    await this.r.constructor.calcAverageRatings(this.r.targetId, this.r.targetType);
  }
});

module.exports = model("Review", ReviewSchema);
