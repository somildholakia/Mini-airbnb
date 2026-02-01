const Joi = require("joi");
const Listing = require("./models/listing");

module.exports.Listing = Joi.object({
    listing: Joi.object({
        title: Joi.string().required(),
        description: Joi.string().required(),
        location: Joi.string().required(),
        country: Joi.string().required(),
        price: Joi.number().required().min(0),

        image: Joi.object({
            filename: Joi.string().required(),
            url: Joi.string().uri().required()
        }).required()
    }).required()
});