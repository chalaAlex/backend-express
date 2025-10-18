const express = require('express');
const morgan = require('morgan');
const app = express();

// Routers
const userRouter = require('./routes/userRoutes');
const tourRouter = require('./routes/tourRoutes');

// 1) MIDDLEWARES
if (process.env.NODE_ENV === "development") {
    app.use(morgan('dev'));
}

app.use(express.json());

// Routes
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

module.exports = app;