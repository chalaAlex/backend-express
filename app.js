const express = require('express');
const morgan = require('morgan');
const app = express();

// Routers
const userRouter = require('./routes/userRoutes');
const tourRouter = require('./routes/tourRoutes');
const internRouter = require('./routes/internRoutes');

if (process.env.NODE_ENV === "development") {
    app.use(morgan('dev'));
}
// 1) MIDDLEWARES
app.use(express.json());
app.set('query parser', 'extended');  // For complex parsing tasks. 

// Routes
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/interns', internRouter);

module.exports = app;