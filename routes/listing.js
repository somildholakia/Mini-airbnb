const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const { listingSchema, reviewSchema } = require("../schema.js");
const review = require("../models/review.js");
const ExpressError = require("../utils/ExpressError.js");
const { isLoggedIn, isOwner } = require("../middleware.js");

const listingController = require("../controllers/listing.js");
const multer  = require('multer')
const upload = multer({ dest: 'uploads/' })



const validateListing = (req, res, next) => {
    let { error } = Listing.validate(req.body.listing);

    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    } else {
        next();
    }
};


//new route 
router.get("/new", isLoggedIn, listingController.renderNewForm);


router.route("/")
    .get(wrapAsync(listingController.index))
    // .post(isLoggedIn, isOwner, validateListing, wrapAsync(listingController.createListing));
    .post(upload.single('listing[image]'),(req,res) => {
        res.send(req.file);
    })

router.route("/:id")
.get( wrapAsync(listingController.showListing))
.put( isLoggedIn, validateListing, wrapAsync(listingController.updateListing))
.delete( isLoggedIn, wrapAsync(listingController.destroyListing));







//edit route

router.get("/:id/edit", isLoggedIn, wrapAsync(listingController.renderEditForm));




module.exports = router;