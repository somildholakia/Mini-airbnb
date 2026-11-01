const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review.js");

const listingSchema = new Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, trim: true, index: { unique: true, sparse: true } },
  description: { type: String, trim: true },
  image: { url: String, filename: String },
  price: { type: Number, min: 0, default: null },
  priceCurrency: { type: String, default: "INR", trim: true },
  location: { type: String, trim: true },
  country: { type: String, trim: true },
  category: { type: String, trim: true, index: true },
  propertyType: { type: String, trim: true, default: "Stay" },
  isCurated: { type: Boolean, default: false, index: true },
  featured: { type: Boolean, default: false, index: true },
  curationSource: { type: String, trim: true },
  curationRank: { type: Number, min: 1 },
  rankingYear: { type: Number, min: 2000, max: 2100 },
  hotelSearchUrl: { type: String, trim: true },
  imageDisclaimer: { type: String, trim: true },
  locationCoordinates: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], default: undefined }
  },
  reviews: [{ type: Schema.Types.ObjectId, ref: "Review" }],
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: function ownerRequiredForMemberListings() { return !this.isCurated; }
  }
});

listingSchema.index({ title: "text", location: "text", country: "text" });
listingSchema.index({ isCurated: 1, featured: -1, curationRank: 1 });
listingSchema.post("findOneAndDelete", async (listing) => {
  if (listing) await Review.deleteMany({ _id: { $in: listing.reviews } });
});

module.exports = mongoose.model("Listing", listingSchema);
