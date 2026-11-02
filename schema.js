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
