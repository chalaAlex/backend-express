// import Review from "../models/Review.model.js";

// export const preventDuplicateReview = async (req, res, next) => {
//   const reviewerId = req.user.id;
//   const truckOwnerId = req.params.truckOwnerId;

//   const existingReview = await Review.findOne({
//     reviewer: reviewerId,
//     truckOwner: truckOwnerId
//   });

//   if (existingReview) {
//     return res.status(409).json({
//       message: "You have already reviewed this truck owner"
//     });
//   }

//   next();
// };
