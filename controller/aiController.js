const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
dotenv.config({ path: `${__dirname}/../config.env` });
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

console.log(process.env.GEMINI_API_KEY);

const getModel = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new AppError('GEMINI_API_KEY is not configured in config.env', 500);
  }
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: 'gemini-3-flash-preview'});
};

exports.improveFreightDescription = catchAsync(async (req, res, next) => {
  const { cargoType, weightKg, quantity, pickupRegion, pickupCity, dropoffRegion, dropoffCity, pickupDate, deliveryDeadline, truckTypes, minCapacityKg, pricingType, currentDescription } = req.body;

  if (!cargoType) return next(new AppError('cargoType is required', 400));

  const contextLines = [
    `Cargo Type: ${cargoType}`,
    weightKg ? `Weight: ${weightKg} kg` : null,
    quantity ? `Quantity: ${quantity} units` : null,
    pickupRegion && pickupCity ? `Pickup: ${pickupCity}, ${pickupRegion}` : null,
    dropoffRegion && dropoffCity ? `Dropoff: ${dropoffCity}, ${dropoffRegion}` : null,
    pickupDate ? `Pickup Date: ${pickupDate}` : null,
    deliveryDeadline ? `Delivery Deadline: ${deliveryDeadline}` : null,
    truckTypes?.length ? `Required Truck Types: ${truckTypes.join(', ')}` : null,
    minCapacityKg ? `Minimum Truck Capacity: ${minCapacityKg} kg` : null,
    pricingType ? `Pricing Type: ${pricingType}` : null,
  ].filter(Boolean).join('\n');

  const prompt = `You are a logistics assistant helping freight owners write clear, professional freight descriptions.

Freight details:
${contextLines}
${currentDescription ? `\nCurrent description: "${currentDescription}"` : ''}

Write a concise, professional freight description (2-3 sentences max) that highlights the key details above. Be direct and informative. Return only the description text, no extra formatting.`;

  const model = getModel();
  const result = await model.generateContent(prompt);
  const suggestion = result.response.text().trim();

  res.status(200).json({ status: 'success', data: { suggestion } });
});

exports.improveCarrierDescription = catchAsync(async (req, res, next) => {
  const { brand, model: truckModel, plateNumber, loadCapacity, features, startLocation, destinationLocation, currentDescription } = req.body;

  if (!brand || !truckModel) return next(new AppError('brand and model are required', 400));

  const contextLines = [
    `Brand: ${brand}`,
    `Model: ${truckModel}`,
    plateNumber ? `Plate Number: ${plateNumber}` : null,
    loadCapacity ? `Load Capacity: ${loadCapacity} kg` : null,
    features?.length ? `Features: ${features.join(', ')}` : null,
    startLocation ? `Start Location: ${startLocation}` : null,
    destinationLocation ? `Destination: ${destinationLocation}` : null,
  ].filter(Boolean).join('\n');

  const prompt = `You are a logistics assistant helping truck owners write compelling carrier descriptions.

Carrier details:
${contextLines}
${currentDescription ? `\nCurrent description: "${currentDescription}"` : ''}

Write a concise, professional carrier description (2-3 sentences max) that highlights the truck's strengths and suitability for freight. Be direct and informative. Return only the description text, no extra formatting.`;

  const model = getModel();
  const result = await model.generateContent(prompt);
  const suggestion = result.response.text().trim();

  res.status(200).json({ status: 'success', data: { suggestion } });
});
