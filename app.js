const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");

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
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);


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

// app.get("/testListing", async (req,res) => {
//     let sampleListing = new Listing({
//         title: "My new home",
//         description: "By the Beach",
//         price: 1200,
//         location: "goa",
//         country: "India",
//     });

//    await sampleListing.save()
//    console.log("Sample was saved");
//    res.send("successful testing");
// })

//Index route

app.get("/listings", async (req,res) => {
  const allListings = await Listing.find({})
    res.render("listings/index.ejs",({allListings}));
})


//new route 
app.get("/listings/new", (req,res) => {
    res.render("listings/new.ejs");
})



//show route
app.get("/listings/:id", async (req,res) => {
    let {id} = req.params;
   let singleListing = await Listing.findById(id);
   console.log(singleListing);
   res.render("listings/show.ejs", {singleListing});
})

app.post("/listings", async (req,res) => {
    let {title,description,price,location,country} = req.body;
   let oneList = await Listing.insertOne({
        title: title,
        description: description,
        price: price,
        location: location,
        country: country,
    });

    console.log(oneList);
    res.redirect("/listings");
})

//edit route

app.get("/listings/:id/edit", async (req,res) =>{
     let {id} = req.params;
     let listing = await Listing.findById(id);
    res.render("listings/edit.ejs",{listing});
})

//update route

app.put("/listings/:id", async (req,res) => {
     let {id} = req.params;
    await Listing.findByIdAndUpdate(id, {...req.body.listing});
    res.redirect("/listings");
})

//DELETE route

app.delete("/listings/:id", async (req,res) => {
    let {id} = req.params;
   await Listing.findByIdAndDelete(id);
   res.redirect("/listings");
   console.log("Deleted successfully");
})