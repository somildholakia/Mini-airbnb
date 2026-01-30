const express = require("express");
const router = express.Router();


//Index route

router.get("/listings", wrapAsync(async (req, res) => {
    const allListings = await Listing.find({})
    res.render("listings/index.ejs", ({ allListings }));
}));


//new route 
router.get("/listings/new", (req, res) => {
    res.render("listings/new.ejs");
})



//show route
router.get("/listings/:id", wrapAsync(async (req, res) => {
    let { id } = req.params;
    let singleListing = await Listing.findById(id).populate("reviews");
    console.log(singleListing);
    res.render("listings/show.ejs", { singleListing });
}));

// Create Route 
router.post("/listings", validateListing ,wrapAsync(async (req, res, next) => {

    let { title, description, price, location, country } = req.body;
    let oneList = await Listing.insertOne({
        title: title,
        description: description,
        price: price,
        location: location,
        country: country,
    });

    console.log(oneList);
    res.redirect("/listings");

}));

//edit route

router.get("/listings/:id/edit", wrapAsync(async (req, res) => {
    let { id } = req.params;
    let listing = await Listing.findById(id);
    res.render("listings/edit.ejs", { listing });
}));

//update route

router.put("/listings/:id", wrapAsync(async (req, res) => {

    if (!req.body.listing) {
        throw new ExpressError(400, "Send Valid data for listing");
    }
    let { id } = req.params;
    await Listing.findByIdAndUpdate(id, { ...req.body.listing });
    res.redirect("/listings");
}));

//DELETE route

router.delete("/listings/:id", wrapAsync(async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndDelete(id);
    res.redirect("/listings");
    console.log("Deleted successfully");
}));

