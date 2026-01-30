const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
// const Listing = require("./models/listing.js");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
// const wrapAsync = require("./utils/wrapAsync.js")
const ExpressError = require("./utils/ExpressError.js");
// const { listingSchema, reviewSchema } = require("./schema.js");
// const Review = require("./models/review.js");
const listings = require("./routes/listing.js");
// const reviews = require("./routes/review.js");
const review = require("./models/review.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/wandersSite";

main()
    .then((res) => {
        console.log("connected to DB")
    })
    .catch((err) => {
        console.log(err);
    });

async function main() {
    await mongoose.connect(MONGO_URL);
}


const port = 8080;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

app.listen(port, () => {
    console.log(`Listening at port:${port}`);
})

// root routee

app.get("/", (req, res) => {
    res.send(" Root working");
})





app.use("/listings", listings);
app.use("/listing/:id/reviews",review);




app.use((req, res, next) => {
    next(new ExpressError(404, "page not found"));
})

app.use((err, req, res, next) => {
    let { statusCode = 500, message = "Something went Wrong" } = err;
    res.status(statusCode).render("error.ejs", { message })
})