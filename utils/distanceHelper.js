// utils/distanceHelper.js
const axios = require("axios");

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function calculateDistanceBetweenCities(pickupCity, dropoffCity) {
  const nominatimUrl = "https://nominatim.openstreetmap.org/search";

  const [pickupResp, dropoffResp] = await Promise.all([
    axios.get(nominatimUrl, { params: { q: pickupCity, format: "json", limit: 1 } }),
    axios.get(nominatimUrl, { params: { q: dropoffCity, format: "json", limit: 1 } }),
  ]);

  if (!pickupResp.data.length || !dropoffResp.data.length) return null;

  const pickupCoords = pickupResp.data[0];
  const dropoffCoords = dropoffResp.data[0];

  return getDistanceFromLatLonInKm(
    parseFloat(pickupCoords.lat),
    parseFloat(pickupCoords.lon),
    parseFloat(dropoffCoords.lat),
    parseFloat(dropoffCoords.lon)
  );
}

module.exports = { calculateDistanceBetweenCities };
