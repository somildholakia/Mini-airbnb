const Listing = require("../models/listing");
const Review = require("../models/review");

module.exports.createReview = async (req, res) => {

    console.log("🔥 REVIEW ROUTE HIT");
    console.log("BODY:", req.body);

    let listing = await Listing.findById(req.params.id);

    if (!listing) {
        req.flash("error", "Listing not found");
        return res.redirect("/listings");
    }

    let newReview = new Review(req.body.review);

    // 🔴 FIX 1: Save owner
    newReview.owner = req.user._id;

    // 🔴 FIX 2: Save review first
    await newReview.save();

    // 🔴 FIX 3: Push review ID
    listing.reviews.push(newReview._id);

    await listing.save();

    req.flash("success", "New Review Created");
    res.redirect(`/listings/${req.params.id}`);
};


module.exports.deleteReview = async (req, res) => {

    let { id, reviewId } = req.params;

    await Listing.findByIdAndUpdate(id, {
        $pull: { reviews: reviewId }
    });

    await Review.findByIdAndDelete(reviewId);

    req.flash("success", "Review Deleted");

    res.redirect(`/listings/${id}`);
};