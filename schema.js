const Joi = require("joi");

module.exports.listingSchema = Joi.object({
    listing: Joi.object({
        title: Joi.string().trim().min(3).max(100).required(),
        description: Joi.string().trim().min(1).max(5000).required(),
        location: Joi.string().trim().min(2).max(120).required(),
        country: Joi.string().trim().min(2).max(80).required(),
        price: Joi.number().integer().required().min(0).max(10000000)
    }).required()
});

module.exports.reviewSchema = Joi.object({
    review: Joi.object({
        rating: Joi.number().integer().required().min(1).max(5),
        comment: Joi.string().trim().min(1).max(1500).required()
    }).required()
});

module.exports.tripSchema = Joi.object({
    trip: Joi.object({
        title: Joi.string().trim().min(3).max(100).required(),
        destination: Joi.string().trim().max(120).allow(""),
        startDate: Joi.string().pattern(/^\\d{4}-\\d{2}-\\d{2}$/).allow("", null),
        endDate: Joi.string().pattern(/^\\d{4}-\\d{2}-\\d{2}$/).allow("", null)
    }).required()
});

module.exports.tripItemSchema = Joi.object({
    item: Joi.object({
        listingId: Joi.string().hex().length(24).required(),
        plannedDate: Joi.string().pattern(/^\\d{4}-\\d{2}-\\d{2}$/).allow(""),
        note: Joi.string().trim().max(500).allow("")
    }).required()
});
