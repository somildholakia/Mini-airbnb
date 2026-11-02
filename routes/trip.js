"use strict";

const express = require("express");
const Joi = require("joi");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn } = require("../middleware");
const security = require("../security");
const ExpressError = require("../utils/ExpressError");
const tripController = require("../controllers/trips");

const createTripSchema = Joi.object({
  trip: Joi.object({
    title: Joi.string().trim().min(3).max(100).required(),
    destination: Joi.string().trim().max(120).allow(""),
    startDate: Joi.date().iso().allow("", null),
    endDate: Joi.date().iso().allow("", null)
  }).required()
});

function validateCreateTrip(req, _res, next) {
  const { error, value } = createTripSchema.validate(req.body, { abortEarly: false, convert: true });
  if (error) {
    return next(new ExpressError(400, error.details.map((item) => item.message).join(", ")));
  }
  req.body = value;
  if (value.trip.startDate && value.trip.endDate && value.trip.endDate < value.trip.startDate) {
    return next(new ExpressError(400, "The trip end date must be on or after its start date."));
  }
  next();
}

// These token routes must precede /:id so they are not parsed as trip IDs.
router.get("/shared/:token", security.browseLimiter, wrapAsync(tripController.shared));
router.get("/invite/:token", isLoggedIn, wrapAsync(tripController.inviteLanding));
router.post("/invite/:token/accept", isLoggedIn, security.tripWriteLimiter, wrapAsync(tripController.acceptInvite));

router.get("/", isLoggedIn, wrapAsync(tripController.index));
router.get("/new", isLoggedIn, tripController.renderNew);
router.post("/", isLoggedIn, security.tripWriteLimiter, validateCreateTrip, wrapAsync(tripController.create));
router.get("/:id", isLoggedIn, wrapAsync(tripController.show));
router.post("/:id/items", isLoggedIn, security.tripWriteLimiter, wrapAsync(tripController.addItem));
router.delete("/:id/items/:itemId", isLoggedIn, security.tripWriteLimiter, wrapAsync(tripController.removeItem));
router.post("/:id/share", isLoggedIn, security.tripWriteLimiter, wrapAsync(tripController.updateSharing));
router.post("/:id/invite-link", isLoggedIn, security.tripWriteLimiter, wrapAsync(tripController.rotateInvite));

module.exports = router;
