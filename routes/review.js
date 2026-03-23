const express = require("express");
const router = express.Router({mergeParams: true});
const wrapAsync = require("../utils/wrapAsync.js");
const Review = require("../models/review.js");
const Listing = require("../models/listing.js");
const { listingSchema, reviewSchema } = require("../schema.js");
const ExpressError = require("../utils/ExpressError.js");
const reviewController = require("../controllers/reviews.js");
const { isLoggedIn, isReviewOwner } = require("../middleware");



const validateReview = (req,res,next) => {
    let {error} = reviewSchema.validate(req.body);

    if(error){
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400,errMsg);
    } else {
        next();
    }
};


// Reviews POST
router.post("/", validateReview ,wrapAsync(reviewController.createReview));

// Delete Review Route

router.delete("/:reviewId",
    isLoggedIn,
    isReviewOwner,
    wrapAsync(reviewController.deleteReview)
);

module.exports = router;