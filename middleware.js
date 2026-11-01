const Listing = require("./models/listing.js");
const Review = require("./models/review.js");

module.exports.isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.redirectUrl = req.originalUrl;
    req.flash("error", "Please log in to continue.");
    return res.redirect("/login");
  }
  next();
};

module.exports.saveRedirectUrl = (req, res, next) => {
  if (req.session.redirectUrl) res.locals.redirectUrl = req.session.redirectUrl;
  next();
};

module.exports.isOwner = async (req, res, next) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) {
    req.flash("error", "Listing not found.");
    return res.redirect("/listings");
  }
  if (listing.isCurated || !listing.owner || !listing.owner.equals(req.user._id)) {
    req.flash("error", "You do not have permission to change this hotel profile.");
    return res.redirect("/listings/" + req.params.id);
  }
  next();
};

module.exports.isReviewOwner = async (req, res, next) => {
  const [review, listing] = await Promise.all([
    Review.findById(req.params.reviewId),
    Listing.findById(req.params.id).select("reviews")
  ]);
  if (!review || !listing || !listing.reviews.some((id) => id.equals(review._id))) {
    req.flash("error", "Review not found.");
    return res.redirect("/listings/" + req.params.id);
  }
  if (!review.owner || !review.owner.equals(req.user._id)) {
    req.flash("error", "You are not the author of this review.");
    return res.redirect("/listings/" + req.params.id);
  }
  next();
};
