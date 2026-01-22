const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/wandersSite";

main()
    .then((res) => {
        console.log("connected to DB")
    })
    .catch((err) => {
        console.log(err);
    });

async function main(){
   await mongoose.connect(MONGO_URL);
}


const port = 8080;

app.use(express.urlencoded({extended: true}));
app.use(express.json());


app.set("view engine","ejs");
app.set("views", path.join(__dirname,"views"));
app.use(express.static(path.join(__dirname,"public")));

app.listen(port, () => {
    console.log(`Listening at port:${port}`);
})

// root routee

app.get("/",(req,res) => {
    res.send(" Root working");
})


//listing sample

app.get("/testListing", async (req,res) => {
    let sampleListing = new Listing({
        title: "My new home",
        description: "By the Beach",
        price: 1200,
        location: "goa",
        country: "India",
    });

   await sampleListing.save()
   console.log("Sample was saved");
   res.send("successful testing");
})