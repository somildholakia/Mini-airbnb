const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const { listingSchema } = require("../schema.js");
const ExpressError = require("../utils/ExpressError.js");
const { isLoggedIn, isOwner } = require("../middleware.js");
const listingController = require("../controllers/listing.js");
const { storage } = require("../cloudConfig.js");
const { getKnownCoordinates } = require("../utils/geocode.js");
const multer = require("multer");

const upload = multer({ storage });
const validateListing = (req, res, next) => {
  const { error } = listingSchema.validate(req.body);
  if (error) {
    const message = error.details.map((item) => item.message).join(", ");
    return next(new ExpressError(400, message));
  }
  next();
};

router.get("/new", isLoggedIn, listingController.renderNewForm);
router.get("/saved", isLoggedIn, wrapAsync(listingController.savedListings));
router.route("/")
  .get(wrapAsync(listingController.index))
  .post(isLoggedIn, upload.single("listing[image]"), validateListing, wrapAsync(listingController.createListing));

// This route must be above /:id so "map-data" is never treated as a listing id.
router.get("/map-data", wrapAsync(async (_req, res) => {
  const listings = await Listing.find({})
    .select("title location country price image locationCoordinates category isCurated")
    .limit(1000)
    .lean();
  res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  res.json({
    status: "ok",
    total: listings.length,
    listings: listings.map((listing) => {
      const coordinates = listing.locationCoordinates?.coordinates
        || getKnownCoordinates(listing.location, listing.country);
      return {
        id: String(listing._id), title: listing.title,
        location: listing.location || "", country: listing.country || "",
        category: listing.category || "", isCurated: Boolean(listing.isCurated),
        price: listing.isCurated ? null : (Number.isFinite(listing.price) ? listing.price : null),
        imageUrl: listing.image?.url || "", coordinates: coordinates || null
      };
    })
  });
}));

router.route("/:id")
  .get(wrapAsync(listingController.showListing))
  .put(isLoggedIn, isOwner, upload.single("listing[image]"), validateListing, wrapAsync(listingController.updateListing))
  .delete(isLoggedIn, isOwner, wrapAsync(listingController.destroyListing));
router.get("/:id/edit", isLoggedIn, isOwner, wrapAsync(listingController.renderEditForm));
router.post("/:id/save", isLoggedIn, wrapAsync(listingController.toggleSavedListing));

module.exports = router;
