// export const validateReview = (req, res, next) => {
//   const { rating, reviewText } = req.body;

//   // Rating validation
//   if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
//     return res.status(400).json({
//       message: "Invalid rating value. Rating must be between 1 and 5."
//     });
//   }

//   // Review text validation (optional field)
//   if (reviewText && reviewText.length > 200) {
//     return res.status(400).json({
//       message: "Review content exceeds 200 characters."
//     });
//   }

//   next();
// };
