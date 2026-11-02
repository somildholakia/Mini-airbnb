const cloudinary = require("cloudinary").v2;
const CloudinaryStorage = require("./utils/CloudinaryStorage");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "wandersSite_dev",
    allowed_formats: ["png", "jpg", "jpeg", "webp"],
    resource_type: "image"
  }
});

module.exports = { cloudinary, storage };
