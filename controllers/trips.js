"use strict";

const crypto = require("node:crypto");
const mongoose = require("mongoose");
const Trip = require("../models/trip");
const Listing = require("../models/listing");
const User = require("../models/user");
const ExpressError = require("../utils/ExpressError");
const { buildTripCalendar } = require("../utils/ical");

function tripAccessFilter(tripId, userId) {
  if (!mongoose.isValidObjectId(tripId)) throw new ExpressError(404, "Trip not found.");
  return {
    _id: tripId,
    $or: [{ owner: userId }, { "collaborators.user": userId }]
  };
}

async function getEditableTrip(tripId, userId) {
  const trip = await Trip.findOne(tripAccessFilter(tripId, userId))
    .select("+inviteToken +shareToken")
    .populate({
      path: "items.listing",
      select: "title image location country category isCurated"
    });
  if (!trip) throw new ExpressError(404, "Trip not found or you do not have access.");
  return trip;
}

function isTripOwner(trip, userId) {
  return Boolean(userId) && String(trip.owner) === String(userId);
}

function validatePlannedDate(value, trip) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new ExpressError(400, "Choose a valid itinerary date.");
  }
  const day = new Date(value + "T00:00:00.000Z");
  if (trip.startDate && day < new Date(trip.startDate.toISOString().slice(0, 10) + "T00:00:00.000Z")) {
    throw new ExpressError(400, "That date is before this trip starts.");
  }
  if (trip.endDate && day > new Date(trip.endDate.toISOString().slice(0, 10) + "T00:00:00.000Z")) {
    throw new ExpressError(400, "That date is after this trip ends.");
  }
  return day;
}

async function renderTrip(req, res, trip, options = {}) {
  const canEdit = options.canEdit === true;
  let savedListings = [];

  if (canEdit) {
    const user = await User.findById(req.user._id)
      .select("savedListings")
      .populate({
        path: "savedListings",
        select: "title location country image",
        options: { sort: { title: 1 }, limit: 100 }
      });
    savedListings = (user?.savedListings || []).filter(Boolean);
  }

  const items = [...trip.items].sort((a, b) => {
    const aDate = a.plannedDate ? new Date(a.plannedDate).getTime() : Number.MAX_SAFE_INTEGER;
    const bDate = b.plannedDate ? new Date(b.plannedDate).getTime() : Number.MAX_SAFE_INTEGER;
    return aDate - bDate || new Date(a.addedAt) - new Date(b.addedAt);
  });

  const viewerId = options.viewerId || req.user?._id;
  const ownerView = isTripOwner(trip, viewerId);
  res.locals.pageTitle = trip.title + " · WanderSite trip";
  res.locals.metaDescription = "A WanderSite trip plan for " + (trip.destination || trip.title) + ".";
  res.render("trips/show.ejs", {
    trip,
    items,
    savedListings,
    canEdit,
    isOwner: ownerView,
    isPublicView: options.isPublicView === true,
    inviteUrl: canEdit && ownerView
      ? req.protocol + "://" + req.get("host") + "/trips/invite/" + trip.inviteToken
      : null,
    publicUrl: trip.isPublic && trip.shareToken
      ? req.protocol + "://" + req.get("host") + "/trips/shared/" + trip.shareToken
      : null,
    calendarUrl: options.isPublicView && trip.shareToken
      ? "/trips/shared/" + encodeURIComponent(trip.shareToken) + "/calendar"
      : "/trips/" + trip._id + "/calendar"
  });
}

module.exports.index = async (req, res) => {
  const trips = await Trip.find({
    $or: [{ owner: req.user._id }, { "collaborators.user": req.user._id }]
  })
    .select("title destination startDate endDate owner collaborators items isPublic updatedAt")
    .sort({ updatedAt: -1 })
    .lean();

  res.locals.pageTitle = "Your trips · WanderSite";
  res.locals.metaDescription = "Plan journeys, organize saved stays and share itineraries with travel companions.";
  res.render("trips/index.ejs", { trips });
};

module.exports.renderNew = (req, res) => {
  res.locals.pageTitle = "Create a trip · WanderSite";
  res.render("trips/new.ejs");
};

module.exports.create = async (req, res) => {
  if (!req.body.trip) throw new ExpressError(400, "Please add trip details.");
  const { title, destination, startDate, endDate } = req.body.trip;
  const trip = new Trip({
    title,
    destination: destination || "",
    startDate: startDate || null,
    endDate: endDate || null,
    owner: req.user._id
  });
  await trip.save();
  req.flash("success", "Your trip has been created. Add saved stays to build the itinerary.");
  res.redirect("/trips/" + trip._id);
};

module.exports.show = async (req, res) => {
  const trip = await getEditableTrip(req.params.id, req.user._id);
  await renderTrip(req, res, trip, { canEdit: true, viewerId: req.user._id });
};

module.exports.addItem = async (req, res) => {
  const trip = await getEditableTrip(req.params.id, req.user._id);
  const listingId = String(req.body.item?.listingId || "");
  if (!mongoose.isValidObjectId(listingId)) throw new ExpressError(400, "Choose a saved stay to add.");

  const [listing, savedByCurrentUser] = await Promise.all([
    Listing.findById(listingId).select("_id"),
    User.exists({ _id: req.user._id, savedListings: listingId })
  ]);
  if (!listing) throw new ExpressError(404, "That stay could not be found.");
  if (!savedByCurrentUser) {
    throw new ExpressError(403, "Save this stay to your WanderSite account before adding it to a trip.");
  }

  const plannedDateInput = String(req.body.item?.plannedDate || "");
  const plannedDate = validatePlannedDate(plannedDateInput, trip);
  const duplicate = trip.items.some((item) =>
    String(item.listing) === String(listing._id) &&
    String(item.plannedDate ? item.plannedDate.toISOString().slice(0, 10) : "") === plannedDateInput
  );
  if (duplicate) {
    req.flash("error", "That stay is already on this trip for the selected date.");
    return res.redirect("/trips/" + trip._id);
  }

  if (trip.items.length >= 100) throw new ExpressError(400, "This trip already has 100 planned stays.");

  trip.items.push({
    listing: listing._id,
    plannedDate,
    note: String(req.body.item?.note || "").trim().slice(0, 500),
    addedBy: req.user._id
  });
  await trip.save();
  req.flash("success", "Stay added to your itinerary.");
  res.redirect("/trips/" + trip._id);
};

module.exports.removeItem = async (req, res) => {
  const trip = await getEditableTrip(req.params.id, req.user._id);
  if (!mongoose.isValidObjectId(req.params.itemId)) throw new ExpressError(404, "Itinerary item not found.");
  const item = trip.items.id(req.params.itemId);
  if (!item) throw new ExpressError(404, "Itinerary item not found.");
  item.deleteOne();
  await trip.save();
  req.flash("success", "Stay removed from the itinerary.");
  res.redirect("/trips/" + trip._id);
};

module.exports.updateSharing = async (req, res) => {
  const trip = await getEditableTrip(req.params.id, req.user._id);
  if (!isTripOwner(trip, req.user._id)) throw new ExpressError(403, "Only the trip owner can change public sharing.");
  trip.isPublic = req.body.enabled === "on";
  if (trip.isPublic && !trip.shareToken) {
    trip.shareToken = crypto.randomBytes(24).toString("hex");
  }
  if (!trip.isPublic) trip.shareToken = undefined;
  await trip.save();
  req.flash("success", trip.isPublic ? "Read-only trip sharing is enabled." : "Public trip sharing is disabled.");
  res.redirect("/trips/" + trip._id);
};

module.exports.rotateInvite = async (req, res) => {
  const trip = await getEditableTrip(req.params.id, req.user._id);
  if (!isTripOwner(trip, req.user._id)) throw new ExpressError(403, "Only the trip owner can create an invite link.");
  trip.inviteToken = crypto.randomBytes(24).toString("hex");
  await trip.save();
  req.flash("success", "A new collaborator invite link has been created. Previous links no longer work.");
  res.redirect("/trips/" + trip._id);
};

module.exports.shared = async (req, res) => {
  const trip = await Trip.findOne({
    shareToken: req.params.token,
    isPublic: true
  })
    .select("+shareToken")
    .populate({
      path: "items.listing",
      select: "title image location country category isCurated"
    });
  if (!trip) throw new ExpressError(404, "This shared trip link is no longer available.");
  await renderTrip(req, res, trip, {
    canEdit: false,
    isPublicView: true,
    viewerId: req.user?._id || trip.owner
  });
};

module.exports.inviteLanding = async (req, res) => {
  const trip = await Trip.findOne({ inviteToken: req.params.token })
    .select("title destination owner collaborators");
  if (!trip) throw new ExpressError(404, "This collaborator invite link is invalid or expired.");
  const alreadyMember = String(trip.owner) === String(req.user._id) ||
    trip.collaborators.some((member) => String(member.user) === String(req.user._id));
  res.locals.pageTitle = "Trip invitation · WanderSite";
  res.render("trips/invite.ejs", { trip, alreadyMember, inviteToken: req.params.token });
};

module.exports.acceptInvite = async (req, res) => {
  const trip = await Trip.findOne({ inviteToken: req.params.token });
  if (!trip) throw new ExpressError(404, "This collaborator invite link is invalid or expired.");

  const alreadyMember = String(trip.owner) === String(req.user._id) ||
    trip.collaborators.some((member) => String(member.user) === String(req.user._id));
  if (!alreadyMember) {
    if (trip.collaborators.length >= 25) {
      throw new ExpressError(400, "This trip has reached its 25-collaborator limit.");
    }
    trip.collaborators.push({ user: req.user._id });
    await trip.save();
  }

  req.flash("success", alreadyMember ? "You're already part of this trip." : "You've joined the shared trip.");
  res.redirect("/trips/" + trip._id);
};

function sendTripCalendar(res, trip) {
  const filename = "wandersite-trip-" + String(trip._id) + ".ics";
  const calendar = buildTripCalendar(trip);
  return res.status(200).set({
    "Content-Type": "text/calendar; charset=utf-8",
    "Content-Disposition": 'attachment; filename="' + filename + '"',
    "Cache-Control": "no-store"
  }).send(calendar);
}

module.exports.downloadCalendar = async (req, res) => {
  const trip = await getEditableTrip(req.params.id, req.user._id);
  return sendTripCalendar(res, trip);
};

module.exports.downloadSharedCalendar = async (req, res) => {
  const trip = await Trip.findOne({
    shareToken: req.params.token,
    isPublic: true
  })
    .select("+shareToken")
    .populate({
      path: "items.listing",
      select: "title location country"
    });
  if (!trip) throw new ExpressError(404, "This shared trip link is no longer available.");
  return sendTripCalendar(res, trip);
};
