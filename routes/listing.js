const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const { listingSchema, reviewSchema } = require("../schema.js");
const review = require("../models/review.js");
const ExpressError = require("../utils/ExpressError.js");




const validateListing = (req, res, next) => {
    let { error } = Listing.validate(req.body.listing);

    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
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
    if(!req.isAuthenticated()){
        req.flash("error","you must be logged In to create a listing.");
       return res.redirect("/listings");
    }
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
router.post("/", validateListing, wrapAsync(async (req, res) => {
    console.log(req.body);
    req.body.listing.image = {
        filename: "default",
        url: "https://images.unsplash.com/photo-1505691938895-1758d7feb511"
    };

    
    const newListing = new Listing(req.body.listing);
    await newListing.save();

    req.flash("success", "New listing created");
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
        req.flash("success", "listing Updated");

    res.redirect("/listings");
}));

//DELETE route

router.delete("/:id", wrapAsync(async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndDelete(id);
    res.redirect("/listings");
    req.flash("success", "listing Deleted");
}));


module.exports = router;