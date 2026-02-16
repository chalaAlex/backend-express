const express = require("express");
const morgan = require("morgan");
const app = express();

// Routers
const userRouter = require("./routes/userRoutes");
const freightRouter = require("./routes/freightRoutes");
const truckRoutes = require("./routes/truckRoutes");
const reviewRoutes = require("./routes/reviewRouter");
const distanceRouter = require("./routes/distanceRoutes");

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
// 1) MIDDLEWARES
app.use(express.json());
app.use((req, res, next) => {
  console.log(req.headers);
  next();
});

app.set("query parser", "extended"); // For complex parsing tasks.

// Routes
app.use("/api/v1/freights", freightRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/trucks", truckRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api", distanceRouter);

module.exports = app;
