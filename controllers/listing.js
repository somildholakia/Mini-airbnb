const Listing = require("../models/listing");
const ExpressError = require("../utils/ExpressError");
const { geocodeLocation, getKnownCoordinates } = require("../utils/geocode");

const PAGE_SIZE = 24;
const CATEGORIES = [
  "Urban luxury", "Resort", "Island resort", "Historic", "Boutique",
  "Safari", "Nature retreat", "Nature lodge", "Wellness", "Country house"
];
const escapeRegex = (value) => value.replace(/[.*+?^\${}()|[\]\\]/g, "\\$&");

module.exports.index = async (req, res) => {
  const q = String(req.query.q || "").trim().slice(0, 80);
  const country = String(req.query.country || "").trim().slice(0, 50);
  const category = CATEGORIES.includes(String(req.query.category || "")) ? String(req.query.category) : "";
  const sort = ["recommended", "name", "newest"].includes(String(req.query.sort || "")) ? String(req.query.sort) : "recommended";
  const pageInput = Number.parseInt(req.query.page, 10);
  const page = Number.isFinite(pageInput) && pageInput > 0 ? pageInput : 1;

  const filter = {};
  if (q) {
    const expression = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ title: expression }, { location: expression }, { country: expression }, { description: expression }, { category: expression }];
  }
  if (country) filter.country = new RegExp("^" + escapeRegex(country) + "$", "i");
  if (category) filter.category = category;

  const sortOptions = {
    recommended: { featured: -1, isCurated: -1, curationRank: 1, title: 1 },
    name: { title: 1 },
    newest: { _id: -1 }
  };

  const totalCount = await Listing.countDocuments(filter);
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const countries = (await Listing.distinct("country", { country: { $exists: true, $ne: "" } }))
    .filter(Boolean).sort((a, b) => a.localeCompare(b));
  const currentPage = Math.min(page, pageCount);
  const [allListings, featuredListings, allCount] = await Promise.all([
    Listing.find(filter).sort(sortOptions[sort]).skip((currentPage - 1) * PAGE_SIZE).limit(PAGE_SIZE)
      .select("title description image price location country category isCurated featured slug").lean(),
    Listing.find({ isCurated: true, featured: true }).sort({ curationRank: 1, title: 1 }).limit(6)
      .select("title image location country category slug").lean(),
    Listing.countDocuments({})
  ]);

  const visiblePages = [];
  for (let n = Math.max(1, currentPage - 2); n <= Math.min(pageCount, currentPage + 2); n += 1) visiblePages.push(n);

  res.render("listings/index.ejs", {
    allListings, featuredListings, allCount, totalCount, currentPage, pageCount, visiblePages,
    hasPrevious: currentPage > 1, hasNext: currentPage < pageCount, categories: CATEGORIES, countries,
    filters: { q, country, category, sort },
    destinationPicks: [
      { name: "Tokyo", country: "Japan", note: "Design, culture & calm" },
      { name: "Paris", country: "France", note: "Classic city escapes" },
      { name: "Bali", country: "Indonesia", note: "Island retreats" },
      { name: "Dubai", country: "United Arab Emirates", note: "Desert & skyline" },
      { name: "Mumbai", country: "India", note: "A city by the sea" },
      { name: "Cape Town", country: "South Africa", note: "Coast & mountain" }
    ]
  });
};

module.exports.renderNewForm = (req, res) => res.render("listings/new.ejs");

module.exports.showListing = async (req, res) => {
  const singleListing = await Listing.findById(req.params.id)
    .populate("owner")
    .populate({ path: "reviews", populate: { path: "owner" } });
  if (!singleListing) throw new ExpressError(404, "Listing not found");
  const mapCoordinates = singleListing.locationCoordinates?.coordinates
    || getKnownCoordinates(singleListing.location, singleListing.country);
  const isSaved = Boolean(req.user?.savedListings?.some((id) => String(id) === String(singleListing._id)));
  res.render("listings/show.ejs", { singleListing, mapCoordinates, isSaved });
};

module.exports.createListing = async (req, res) => {
  if (!req.body.listing) throw new ExpressError(400, "Please provide listing details.");
  if (!req.file) throw new ExpressError(400, "Please upload a listing image.");
  const newListing = new Listing(req.body.listing);
  newListing.owner = req.user._id;
  newListing.isCurated = false;
  newListing.image = { url: req.file.path, filename: req.file.filename };
  const coordinates = await geocodeLocation(newListing.location, newListing.country);
  if (coordinates) newListing.locationCoordinates = { type: "Point", coordinates };
  await newListing.save();
  req.flash("success", "Your stay has been published.");
  res.redirect("/listings");
};

module.exports.renderEditForm = async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new ExpressError(404, "Listing not found");
  res.render("listings/edit.ejs", { listing });
};

module.exports.updateListing = async (req, res) => {
  if (!req.body.listing) throw new ExpressError(400, "Send valid data for listing.");
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new ExpressError(404, "Listing not found");
  if (listing.isCurated) throw new ExpressError(403, "Editorial hotel profiles cannot be edited as host listings.");
  const locationChanged = listing.location !== req.body.listing.location || listing.country !== req.body.listing.country;
  Object.assign(listing, req.body.listing);
  if (req.file) listing.image = { url: req.file.path, filename: req.file.filename };
  if (locationChanged || !listing.locationCoordinates?.coordinates?.length) {
    const coordinates = await geocodeLocation(listing.location, listing.country);
    listing.locationCoordinates = coordinates ? { type: "Point", coordinates } : undefined;
  }
  await listing.save();
  req.flash("success", "Your listing has been updated.");
  res.redirect("/listings/" + req.params.id);
};

module.exports.destroyListing = async (req, res) => {
  const deleted = await Listing.findOneAndDelete({ _id: req.params.id, isCurated: { $ne: true } });
  if (!deleted) throw new ExpressError(404, "Listing not found or cannot be deleted.");
  req.flash("success", "Your listing has been deleted.");
  res.redirect("/listings");
};
