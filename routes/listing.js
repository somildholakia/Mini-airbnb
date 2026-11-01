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
        const errMsg = error.details.map((el) => el.message).join(", ");
        return next(new ExpressError(400, errMsg));
    }

    next();
};

router.get("/new", isLoggedIn, listingController.renderNewForm);

router.route("/")
    .get(wrapAsync(listingController.index))
    .post(
        isLoggedIn,
        upload.single("listing[image]"),
        validateListing,
        wrapAsync(listingController.createListing)
    );

// Must be declared before /:id so "map-data" is not treated as a listing id.
router.get("/map-data", wrapAsync(async (_req, res) => {
    const listings = await Listing.find({})
        .select("title location country price image locationCoordinates")
        .limit(200)
        .lean();

    res.set("Cache-Control", "private, max-age=30");
    res.json({
        status: "ok",
        listings: listings.map((listing) => {
            const coordinates = listing.locationCoordinates?.coordinates
                || getKnownCoordinates(listing.location, listing.country);

            return {
                id: String(listing._id),
                title: listing.title,
                location: listing.location || "",
                country: listing.country || "",
                price: Number(listing.price) || 0,
                imageUrl: listing.image?.url || "",
                coordinates: coordinates || null
            };
        })
    });
}));

router.route("/:id")
    .get(wrapAsync(listingController.showListing))
    .put(
        isLoggedIn,
        isOwner,
        upload.single("listing[image]"),
        validateListing,
        wrapAsync(listingController.updateListing)
    )
    .delete(
        isLoggedIn,
        isOwner,
        wrapAsync(listingController.destroyListing)
    );

router.get("/:id/edit", isLoggedIn, isOwner, wrapAsync(listingController.renderEditForm));

module.exports = router;
