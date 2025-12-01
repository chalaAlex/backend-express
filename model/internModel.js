const mongoose = require('mongoose');

// -------------- Schema ------------------- //
const internSchema = mongoose.Schema({ 
    name: { 
        type: String,
        unique: true,
        required: [true, "An internship must have a name"],
        trim: true,
    },

    category: { 
        type: String,
        required: [true, ""],
    },

    startTime: { 
        type: Date,
        required: [true, "An intern must have start time"],
        default: Date.now,
    }
});

const Intern = mongoose.model('Intern', internSchema);

module.exports = Intern;