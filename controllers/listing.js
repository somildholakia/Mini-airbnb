const Listing = require("../models/listing");
const ExpressError = require("../utils/ExpressError");
const { geocodeLocation, getKnownCoordinates } = require("../utils/geocode");

module.exports.index = async (req, res) => {
    const allListings = await Listing.find({}).sort({ _id: -1 });
    res.render("listings/index.ejs", { allListings });
};

module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
    const { id } = req.params;
    const singleListing = await Listing.findById(id)
        .populate("reviews")
        .populate("owner");

    if (!singleListing) {
        throw new ExpressError(404, "Listing not found");
    }

    const mapCoordinates = singleListing.locationCoordinates?.coordinates
        || getKnownCoordinates(singleListing.location, singleListing.country);

    res.render("listings/show.ejs", { singleListing, mapCoordinates });
};

module.exports.createListing = async (req, res) => {
    if (!req.body.listing) {
        throw new ExpressError(400, "Please provide listing details.");
    }

    if (!req.file) {
        throw new ExpressError(400, "Please upload a listing image.");
    }

    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    newListing.image = {
        url: req.file.path,
        filename: req.file.filename
    };

    const coordinates = await geocodeLocation(newListing.location, newListing.country);
    if (coordinates) {
        newListing.locationCoordinates = {
            type: "Point",
            coordinates
        };
    }

    await newListing.save();
    req.flash("success", "New listing created");
    res.redirect("/listings");
};

module.exports.renderEditForm = async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
        throw new ExpressError(404, "Listing not found");
    }

    res.render("listings/edit.ejs", { listing });
};

module.exports.updateListing = async (req, res) => {
    if (!req.body.listing) {
        throw new ExpressError(400, "Send valid data for listing.");
    }

    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
        throw new ExpressError(404, "Listing not found");
    }

    const locationChanged =
        listing.location !== req.body.listing.location
        || listing.country !== req.body.listing.country;

    Object.assign(listing, req.body.listing);

    if (req.file) {
        listing.image = {
            url: req.file.path,
            filename: req.file.filename
        };
    }

    if (locationChanged || !listing.locationCoordinates?.coordinates?.length) {
        const coordinates = await geocodeLocation(listing.location, listing.country);
        listing.locationCoordinates = coordinates
            ? { type: "Point", coordinates }
            : undefined;
    }

    await listing.save();
    req.flash("success", "Listing updated");
    res.redirect("/listings/" + id);
};

module.exports.destroyListing = async (req, res) => {
    const { id } = req.params;
    const deletedListing = await Listing.findByIdAndDelete(id);

    if (!deletedListing) {
        throw new ExpressError(404, "Listing not found");
    }

    req.flash("success", "Listing deleted");
    res.redirect("/listings");
};
