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

function validateCalendarDate(value, helpers) {
    if (value === "" || value === null || value === undefined) return value;
    const date = new Date(value + "T00:00:00.000Z");
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        return helpers.error("date.invalid");
    }
    return value;
}

module.exports.tripSchema = Joi.object({
    trip: Joi.object({
        title: Joi.string().trim().min(3).max(100).required(),
        destination: Joi.string().trim().max(120).allow(""),
        startDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).custom(validateCalendarDate).allow("", null),
        endDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).custom(validateCalendarDate).allow("", null)
    }).required()
});

module.exports.tripUpdateSchema = module.exports.tripSchema;

module.exports.tripOrderSchema = Joi.object({
    itemIds: Joi.string().pattern(/^[a-f0-9]{24}(?:,[a-f0-9]{24}){0,99}$/).max(2499).required()
});

module.exports.tripItemSchema = Joi.object({
    item: Joi.object({
        listingId: Joi.string().hex().length(24).required(),
        plannedDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).custom(validateCalendarDate).allow(""),
        note: Joi.string().trim().max(500).allow("")
    }).required()
});
