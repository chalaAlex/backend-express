// import Review from "../models/Review.model.js";

// export const createReview = async (req, res) => {
//   const reviewerId = req.user.id;
//   const truckOwnerId = req.params.truckOwnerId;
//   const { rating, reviewText } = req.body;

//   const review = await Review.create({
//     reviewer: reviewerId,
//     truckOwner: truckOwnerId,
//     rating,
//     reviewText
//   });

//   // (Optional but recommended)
//   // updateTruckOwnerRating(truckOwnerId);

//   return res.status(201).json({
//     message: "Review created successfully",
//     data: review
//   });
// };
