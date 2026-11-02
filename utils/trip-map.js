"use strict";

const { getKnownCoordinates } = require("./geocode");

function isValidCoordinates(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return false;
  const [longitude, latitude] = coordinates.map(Number);
  return Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    Math.abs(longitude) <= 180 &&
    Math.abs(latitude) <= 90;
}

function getTripMapPoints(items) {
  return (items || []).reduce((points, item) => {
    const listing = item?.listing;
    if (!listing) return points;

    const stored = listing.locationCoordinates?.coordinates;
    const coordinates = isValidCoordinates(stored)
      ? stored.map(Number)
      : getKnownCoordinates(listing.location, listing.country);

    if (!isValidCoordinates(coordinates)) return points;

    points.push({
      itemId: String(item._id || ""),
      listingId: String(listing._id || ""),
      title: String(listing.title || "WanderSite stay"),
      location: String(listing.location || ""),
      country: String(listing.country || ""),
      coordinates: coordinates.map(Number)
    });
    return points;
  }, []);
}

module.exports = { getTripMapPoints, isValidCoordinates };
