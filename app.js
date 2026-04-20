const express = require("express");
const morgan = require("morgan");
const errorController = require("./controller/errorController");
const app = express();
const fabricToken = require("../backend-express/services/applyFabricTokenService");

// Routers
const userRouter = require("./routes/userRoutes");
const freightRouter = require("./routes/freightRoutes");
const carrierRoutes = require("./routes/carrierRoutes");
const reviewRoutes = require("./routes/reviewRouter");
const distanceRouter = require("./routes/distanceRoutes");
const biddingRouter = require("./routes/bidsRouter");
const locationRouter = require("./routes/locationRouter");
const cargoTypeRouter = require("./routes/cargoType");
const shipmentRequestsRouter = require("./routes/shipmentRequestRoutes");
const companyRouter = require("./routes/companyRoute");
const driverRouter = require("./routes/driverRoute");
const regionRouter = require("./routes/regionRoutes");
const cityRouter = require("./routes/cityRoutes");
const brandRouter = require("./routes/brandRoutes");
const featureRouter = require("./routes/featureRoutes");
const carrierTypeRouter = require("./routes/carrierTypeRoutes");
const chatRouter = require("./routes/chatRoutes");
const notificationRouter = require("./routes/notificationRoutes");
const paymentRouter = require("./routes/paymentRoutes");
const walletRouter = require("./routes/walletRoutes");
const adminPaymentRouter = require("./routes/adminPaymentRoutes");

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
// 1) MIDDLEWARES
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  next();
});

app.set("query parser", "extended"); // For complex parsing tasks.
// Routes
app.use("/api/v1/freights", freightRouter);
app.use("/api/v1/location", locationRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/carrier", carrierRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/bid", biddingRouter);
app.use("/api/v1/shipmentRequests", shipmentRequestsRouter);
app.use("/api/v1/cargoType", cargoTypeRouter);
app.use("/api/v1/companies", companyRouter);
app.use("/api/v1/driver", driverRouter);
app.use("/api/v1/regions", regionRouter);
app.use("/api/v1/cities", cityRouter);
app.use("/api/v1/brands", brandRouter);
app.use("/api/v1/features", featureRouter);
app.use("/api/v1/carrier-types", carrierTypeRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/payments", paymentRouter);
app.use("/api/v1/wallet", walletRouter);
app.use("/api/v1/admin", adminPaymentRouter);
app.use("/api", distanceRouter);

// Global error handler — must be last
app.use(errorController);

module.exports = app;
