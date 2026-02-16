// controllers/distanceController.js
const axios = require("axios");

exports.calculateDistance = async (req, res) => {
  try {
    const { pickup, dropoff } = req.query;

    if (!pickup || !dropoff) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide both pickup and dropoff locations",
      });
    }

    const nominatimUrl = "https://nominatim.openstreetmap.org/search";

    const [pickupResponse, dropoffResponse] = await Promise.all([
      axios.get(nominatimUrl, { params: { q: pickup, format: "json", limit: 1 } }),
      axios.get(nominatimUrl, { params: { q: dropoff, format: "json", limit: 1 } }),
    ]);

    if (!pickupResponse.data.length || !dropoffResponse.data.length) {
      return res.status(404).json({
        status: "fail",
        message: "Could not find coordinates for one or both locations",
      });
    }

    const pickupCoords = pickupResponse.data[0];
    const dropoffCoords = dropoffResponse.data[0];

    const distanceKm = getDistanceFromLatLonInKm(
      parseFloat(pickupCoords.lat),
      parseFloat(pickupCoords.lon),
      parseFloat(dropoffCoords.lat),
      parseFloat(dropoffCoords.lon)
    );

    res.status(200).json({
      status: "success",
      pickup,
      dropoff,
      distanceKm: distanceKm.toFixed(2),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};


