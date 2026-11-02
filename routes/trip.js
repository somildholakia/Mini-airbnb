"use strict";

const express = require("express");
const { tripSchema, tripItemSchema, tripOrderSchema } = require("../schema");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn } = require("../middleware");
const security = require("../security");
const ExpressError = require("../utils/ExpressError");
const tripController = require("../controllers/trips");

function validateCreateTrip(req, _res, next) {
  const { error, value } = tripSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return next(new ExpressError(400, error.details.map((item) => item.message).join(", ")));
  }
  req.body = value;
  if (value.trip.startDate && value.trip.endDate && value.trip.endDate < value.trip.startDate) {
    return next(new ExpressError(400, "The trip end date must be on or after its start date."));
  }
  next();
}

function validateTripItem(req, _res, next) {
  const { error, value } = tripItemSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return next(new ExpressError(400, error.details.map((item) => item.message).join(", ")));
  }
  req.body = value;
  next();
}

function validateTripOrder(req, _res, next) {
  const { error, value } = tripOrderSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return next(new ExpressError(400, error.details.map((item) => item.message).join(", ")));
  }
  req.body = value;
  next();
}

// Token routes must precede /:id so they are not parsed as trip IDs.
router.get("/shared/:token/calendar", security.browseLimiter, wrapAsync(tripController.downloadSharedCalendar));
router.get("/shared/:token", security.browseLimiter, wrapAsync(tripController.shared));
router.get("/invite/:token", isLoggedIn, wrapAsync(tripController.inviteLanding));
router.post("/invite/:token/accept", isLoggedIn, security.tripWriteLimiter, wrapAsync(tripController.acceptInvite));

router.get("/", isLoggedIn, wrapAsync(tripController.index));
router.get("/new", isLoggedIn, tripController.renderNew);
router.post("/", isLoggedIn, security.tripWriteLimiter, validateCreateTrip, wrapAsync(tripController.create));
router.get("/:id/calendar", isLoggedIn, wrapAsync(tripController.downloadCalendar));
router.post("/:id/details", isLoggedIn, security.tripWriteLimiter, validateCreateTrip, wrapAsync(tripController.updateDetails));
router.post("/:id/items/order", isLoggedIn, security.tripWriteLimiter, validateTripOrder, wrapAsync(tripController.reorderItems));
router.get("/:id", isLoggedIn, wrapAsync(tripController.show));
router.post("/:id/items", isLoggedIn, security.tripWriteLimiter, validateTripItem, wrapAsync(tripController.addItem));
router.delete("/:id/items/:itemId", isLoggedIn, security.tripWriteLimiter, wrapAsync(tripController.removeItem));
router.post("/:id/share", isLoggedIn, security.tripWriteLimiter, wrapAsync(tripController.updateSharing));
router.post("/:id/invite-link", isLoggedIn, security.tripWriteLimiter, wrapAsync(tripController.rotateInvite));

module.exports = router;
