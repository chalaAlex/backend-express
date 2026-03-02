const express = require("express");
const userController = require("./../controller/userController");
const authController = require("./../controller/authController");
// TODO: Import truck router.
const truckRouter = require("./../routes/truckRoutes");


// 3) ROUTES
const router = express.Router();

router.use("/:userId/truck", truckRouter);

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/forgotPassword", authController.forgotPassword);
router.patch("/resetPassword/:token", authController.resetPassword);

router
  .route("/")
  .get(userController.getAllUsers)
  .post(userController.createUser);
router
  .route("/:id")
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;