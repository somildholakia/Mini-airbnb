const User = require("../models/user");
const Listing = require("../models/listing");

function safeReturnTo(value) {
    if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/saved";
    if (value === "/saved" || value.startsWith("/listings") || value === "/trips" || value.startsWith("/trips/")) return value;
    return "/saved";
}

module.exports.renderSignupForm = (req, res) => res.render("users/signup.ejs");
module.exports.renderLoginForm = (req, res) => res.render("users/login.ejs");

module.exports.singup = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        const registeredUser = await User.register(new User({ email, username }), password);
        await new Promise((resolve, reject) => {
            req.login(registeredUser, (error) => error ? reject(error) : resolve());
        });
        req.flash("success", "Your WanderSite account is ready.");
        res.redirect("/listings");
    } catch (error) {
        if (error.name === "UserExistsError") {
            req.flash("error", "That username is already in use. Please choose another.");
            return res.redirect("/signup");
        }
        return next(error);
    }
};

module.exports.login = async (req, res) => {
    req.flash("success", "Welcome back to WanderSite.");
    res.redirect(safeReturnTo(res.locals.redirectUrl || "/listings"));
};

module.exports.logout = (req, res, next) => {
    req.logout((error) => {
        if (error) return next(error);
        req.flash("success", "You have been logged out.");
        res.redirect("/listings");
    });
};

module.exports.renderSaved = async (req, res) => {
    res.locals.pageTitle = "Your saved hotels · WanderSite";
    res.locals.metaDescription = "Your personal shortlist of saved hotels and stays on WanderSite.";
    const user = await User.findById(req.user._id)
        .populate({ path: "savedListings", options: { sort: { featured: -1, title: 1 } } });
    res.render("users/saved.ejs", { savedListings: (user?.savedListings || []).filter(Boolean) });
};

module.exports.saveListing = async (req, res) => {
    const listing = await Listing.findById(req.params.id).select("_id");
    if (!listing) {
        req.flash("error", "That stay could not be found.");
        return res.redirect(safeReturnTo(req.body.returnTo));
    }
    await User.updateOne({ _id: req.user._id }, { $addToSet: { savedListings: listing._id } });
    req.flash("success", "Saved to your trip list.");
    res.redirect(safeReturnTo(req.body.returnTo));
};

module.exports.removeSavedListing = async (req, res) => {
    await User.updateOne({ _id: req.user._id }, { $pull: { savedListings: req.params.id } });
    req.flash("success", "Removed from your saved stays.");
    res.redirect(safeReturnTo(req.body.returnTo));
};
