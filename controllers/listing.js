const Listing = require("../models/listing");

module.exports.index = async (req, res) => {
    const allListings = await Listing.find({})
    res.render("listings/index.ejs", ({ allListings }));
}

module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs");
}

module.exports.showListing = async (req, res) => {
    let { id } = req.params;
    let singleListing = await Listing.findById(id).populate("reviews").populate("owner");
    console.log(singleListing);
    res.render("listings/show.ejs", { singleListing });
}

module.exports.createListing = async (req, res) => {
    let url = req.file.path;
    let filename = req.file.filename;


    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    newListing.image = { url, filename };
    await newListing.save();

    req.flash("success", "New listing created");
    res.redirect("/listings");
}

module.exports.renderEditForm = async (req, res) => {
    let { id } = req.params;
    let listing = await Listing.findById(id);
    res.render("listings/edit.ejs", { listing });
}

module.exports.updateListing = async (req, res) => {

    if (!req.body.listing) {
        throw new ExpressError(400, "Send Valid data for listing");
    }
    let { id } = req.params;
    let listing = await Listing.findById(id);
    if (!listing.owner.equals(res.locals.currUser._id)) {
        req.flash("error", "You don't have permission to edit");
        return res.redirect(`/listings/${id}`);

    }
    else {
        let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });

        if (typeof req.file !== "undefined") {
            let url = req.file.path;
            let filename = req.file.filename;
            listing.image = { url, filename };
            await listing.save();
        }

        req.flash("success", "listing Updated");

        res.redirect(`/listings/${id}`);
    }
}

module.exports.destroyListing = async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing Deleted");
    res.redirect("/listings");
}