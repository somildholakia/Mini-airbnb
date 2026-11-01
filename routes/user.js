const express = require("express");
const router = express.Router({ mergeParams: true });
const wrapAsync = require("../utils/wrapAsync");
const passport = require("passport");
const { isLoggedIn, saveRedirectUrl } = require("../middleware.js");
const userController = require("../controllers/users.js");

router.get("/signup", userController.renderSignupForm);
router.post("/signup", wrapAsync(userController.singup));
router.get("/login", userController.renderLoginForm);
router.post("/login", saveRedirectUrl, passport.authenticate("local", { failureRedirect: "/login", failureFlash: true }), userController.login);
router.get("/logout", userController.logout);

router.get("/saved", isLoggedIn, wrapAsync(userController.renderSaved));
router.post("/saved/:id", isLoggedIn, wrapAsync(userController.saveListing));
router.post("/saved/:id/remove", isLoggedIn, wrapAsync(userController.removeSavedListing));

module.exports = router;
