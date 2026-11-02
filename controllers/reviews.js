const Listing = require("../models/listing");
const Review = require("../models/review");

module.exports.createReview = async (req, res) => {

    let listing = await Listing.findById(req.params.id);

    if (!listing) {
        req.flash("error", "Listing not found");
        return res.redirect("/listings");
    }

    let newReview = new Review(req.body.review);

    newReview.owner = req.user._id;
    await newReview.save();

    try {
        const linkedListing = await Listing.findByIdAndUpdate(
            listing._id,
            { $push: { reviews: newReview._id } },
            { new: false }
        ).select("_id");

        if (!linkedListing) {
            await Review.deleteOne({ _id: newReview._id });
            req.flash("error", "This stay is no longer available.");
            return res.redirect("/listings");
        }
    } catch (error) {
        // Avoid leaving an unlinked review behind if the listing update fails.
        await Review.deleteOne({ _id: newReview._id }).catch(() => undefined);
        throw error;
    }

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