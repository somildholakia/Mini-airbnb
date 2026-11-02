const assert = require("node:assert/strict");
const { listingSchema, reviewSchema } = require("../schema");

const validListing = {
  listing: {
    title: "A quiet lake cabin",
    description: "A comfortable stay beside the lake with easy access to the walking trail.",
    location: "Pune",
    country: "India",
    price: 2500
  }
};

assert.equal(listingSchema.validate(validListing).error, undefined, "valid listings should pass");
assert.ok(
  listingSchema.validate({
    listing: { ...validListing.listing, title: "x".repeat(101) }
  }).error,
  "listing titles longer than 100 characters should fail"
);
assert.ok(
  listingSchema.validate({
    listing: { ...validListing.listing, price: -1 }
  }).error,
  "negative nightly prices should fail"
);
assert.ok(
  listingSchema.validate({
    listing: { ...validListing.listing, price: 10000001 }
  }).error,
  "unreasonably large nightly prices should fail"
);

const validReview = { review: { rating: 5, comment: "A lovely stay and a very helpful host." } };
assert.equal(reviewSchema.validate(validReview).error, undefined, "valid reviews should pass");
assert.ok(
  reviewSchema.validate({ review: { rating: 6, comment: "An invalid rating." } }).error,
  "ratings above five should fail"
);
assert.ok(
  reviewSchema.validate({
    review: { rating: 5, comment: "x".repeat(1501) }
  }).error,
  "review comments longer than 1500 characters should fail"
);

process.stdout.write("Validated listing and review input constraints.\n");
