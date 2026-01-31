const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const { listingSchema, reviewSchema } = require("../schema.js");
const review = require("../models/review.js");
const ExpressError = require("../utils/ExpressError.js");



const validateListing = (req, res, next) => {
    let { error } = listingSchema.validate(req.body);

    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, error);
    } else {
        next();
    }
};


//Index route

router.get("/", wrapAsync(async (req, res) => {
    const allListings = await Listing.find({})
    res.render("listings/index.ejs", ({ allListings }));
}));


//new route 
router.get("/new", (req, res) => {
    res.render("listings/new.ejs");
})



//show route
router.get("/:id", wrapAsync(async (req, res) => {
    let { id } = req.params;
    let singleListing = await Listing.findById(id).populate("reviews");
    console.log(singleListing);
    res.render("listings/show.ejs", { singleListing });
}));

// Create Route 
router.post("/", validateListing, wrapAsync(async (req, res, next) => {

    let { title, description, price, location, country } = req.body;
    let oneList = await Listing.insertOne({
        title: title,
        description: description,
        price: price,
        location: location,
        country: country,
    });

    console.log(oneList);
    res.redirect("/listings");

}));

//edit route

router.get("/:id/edit", wrapAsync(async (req, res) => {
    let { id } = req.params;
    let listing = await Listing.findById(id);
    res.render("listings/edit.ejs", { listing });
}));

//update route

router.put("/:id", wrapAsync(async (req, res) => {

    if (!req.body.listing) {
        throw new ExpressError(400, "Send Valid data for listing");
    }
    let { id } = req.params;
    await Listing.findByIdAndUpdate(id, { ...req.body.listing });
    res.redirect("/listings");
}));

//DELETE route

router.delete("/:id", wrapAsync(async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndDelete(id);
    res.redirect("/listings");
    console.log("Deleted successfully");
}));


module.exports = router;