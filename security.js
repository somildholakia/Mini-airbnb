const { rateLimit } = require("express-rate-limit");

function createLimiter({ limit, message, windowMs = 15 * 60 * 1000 }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler(_req, res) {
      res.status(429).render("error.ejs", { message });
    }
  });
}

// These limits are intentionally generous for normal human browsing.
module.exports = {
  browseLimiter: createLimiter({
    limit: 180,
    message: "You have made a lot of browse requests in a short time. Please wait a few minutes and try again."
  }),
  authLimiter: createLimiter({
    limit: 8,
    message: "Too many sign-in or sign-up attempts. Please wait 15 minutes before trying again."
  }),
  listingWriteLimiter: createLimiter({
    limit: 8,
    message: "Too many listing changes from this connection. Please wait before trying again."
  }),
  reviewLimiter: createLimiter({
    limit: 5,
    message: "You have posted several reviews recently. Please wait before submitting another."
  })
};
