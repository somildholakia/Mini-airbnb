const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const { listingSchema, reviewSchema } = require("../schema.js");
const ExpressError = require("../utils/ExpressError.js");



const validateReview = (req,res,next) => {
    let {error} = reviewSchema.validate(req.body);

    if(error){
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400,error);
    } else {
        next();
    }
};




// Reviews POST
router.post("/", validateReview ,wrapAsync( async (req,res) => {

  let listing = await Listing.findById(req.params.id);
    let newReview = new Review(req.body.review);

    listing.reviews.push(newReview);

    await newReview.save();
    await listing.save();

    console.log("new review Saved");
    res.redirect(`/listings/${req.params.id}`);
}));

// Delete Review Route
router.delete("/:reviewId", wrapAsync( async (req,res) =>{

    let {id, reviewId} = req.params;
   await Listing.findByIdAndUpdate(id, {$pull: {reviews: reviewId}});
   await Review.findByIdAndDelete(reviewId);

   res.redirect(`/listings/${id}`);
}));

module.exports = router;