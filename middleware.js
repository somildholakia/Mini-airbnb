const Listing = require("./models/listing.js");
const Review = require("./models/review");

// 🔐 LOGIN CHECK
module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.redirectUrl = req.originalUrl;
        req.flash("error", "you must be logged In to create a listing.");
        return res.redirect("/login");
    }
    next();
};

// 🔁 REDIRECT URL SAVE
module.exports.saveRedirectUrl = (req, res, next) => {
    if (req.session.redirectUrl) {
        res.locals.redirectUrl = req.session.redirectUrl;
    }
    next();
};

// 🔐 LISTING OWNER CHECK
module.exports.isOwner = async (req, res, next) => {
    let { id } = req.params;
    let listing = await Listing.findById(id);

    if (!listing) {
        req.flash("error", "Listing not found");
        return res.redirect("/listings");
    }

    if (!listing.owner.equals(req.user._id)) {
        req.flash("error", "You don't have permission");
        return res.redirect(`/listings/${id}`);
    }

    next();
};

// 🔐 REVIEW OWNER CHECK (FIXED POSITION)
module.exports.isReviewOwner = async (req, res, next) => {
    let { reviewId, id } = req.params;

    let review = await Review.findById(reviewId);

    if (!review) {
        req.flash("error", "Review not found");
        return res.redirect(`/listings/${id}`);
    }

    if (!review.owner.equals(req.user._id)) {
        req.flash("error", "You are not the author of this review");
        return res.redirect(`/listings/${id}`);
    }

    next();
};