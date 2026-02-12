const express = require("express");
const morgan = require("morgan");
const app = express();

// Routers
const userRouter = require("./routes/userRoutes");
const tourRouter = require("./routes/tourRoutes");
const freightRouter = require("./routes/freightRoutes");
const truckRoutes = require("./routes/truckRoutes");

// const reviewRouter = require("./routes/reviewRouter");

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
// 1) MIDDLEWARES
app.use(express.json()); // Should be placed here. 

app.use((req, res, next) => {
  console.log(req.headers);

  next();
});

app.set("query parser", "extended"); // For complex parsing tasks.

// Routes
app.use("/api/v1/freights", freightRouter);
app.use("/api/v1/users", userRouter);
// app.use("/api/v1/truck-owners", reviewRouter);
app.use("/api/v1/trucks", truckRoutes);

module.exports = app;