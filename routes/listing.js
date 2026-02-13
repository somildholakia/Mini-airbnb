const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const { listingSchema, reviewSchema } = require("../schema.js");
const review = require("../models/review.js");
const ExpressError = require("../utils/ExpressError.js");
const {isLoggedIn, isOwner} = require("../middleware.js");

const listingController = require("../controllers/listing.js");


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

router.get("/", wrapAsync(listingController.index));


//new route 
router.get("/new", isLoggedIn, listingController.renderNewForm);



//show route
router.get("/:id", wrapAsync(listingController.showListing));

// Create Route 
router.post("/", isLoggedIn,isOwner, validateListing, wrapAsync(listingController.createListing));

//edit route

router.get("/:id/edit", isLoggedIn, wrapAsync(listingController.renderEditForm));

//update route

router.put("/:id", isLoggedIn,validateListing, wrapAsync(listingController.updateListing));

//DELETE route

router.delete("/:id", isLoggedIn, wrapAsync(listingController.destroyListing));


module.exports = router;