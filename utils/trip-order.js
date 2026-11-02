"use strict";

function applyItemOrder(items, requestedIds) {
  if (!Array.isArray(items) || !Array.isArray(requestedIds)) {
    throw new TypeError("A complete itinerary order is required.");
  }

  const currentIds = items.map((item) => String(item._id));
  const requested = requestedIds.map((id) => String(id));
  const currentSet = new Set(currentIds);
  const requestedSet = new Set(requested);

  if (
    requested.length !== currentIds.length ||
    requestedSet.size !== requested.length ||
    requested.some((id) => !currentSet.has(id))
  ) {
    throw new Error("The itinerary order is invalid. Refresh the page and try again.");
  }

  const byId = new Map(items.map((item) => [String(item._id), item]));
  requested.forEach((id, position) => {
    byId.get(id).position = position;
  });

  return items;
}

module.exports = { applyItemOrder };
