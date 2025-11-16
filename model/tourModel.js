const mongoose = require('mongoose');

// ---------------- Schema --------------
const tourSchema = mongoose.Schema({
    name: {
        type: String,
        unique: true,
        required: [true, "A tour must have a name"],
        trim: true,
    },
    duration: {
        type: Number,
        required: [true, "A tour must have a duratioon"]
    },
    maxGroupSize: {
        type: Number,
        required: [true, "A tour must have a group size"]
    },
    difficulty: {
        type: String,
        required: [true, "A tour must have a difficulty"],
        trim: true,
    },
    ratingAverage: {
        type: Number,
        default: 4.6,
    },
    ratingsQuantit: {
        type: Number,
        default: 0,
    },
    price: {
        type: Number,
        required: [true, "Please give the price"],
    },
    priceDiscount: Number,
    summary: {  
        type: String,
        trim: true,
        required: [true, "A tour muust have a summary"],
    },
    description: { 
        type: String,
        trim: true,
     },
     imageCover: { 
        type: String,
        required: [true, "A tour must have a cover image"],
     },
     image: [String],
     createdAt: { 
        type: Date,
        defaut: Date.now,
      },
      startDates: [Date],
});

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;