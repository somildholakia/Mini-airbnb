module.exports.isLoggedIn = (req,res,next) => {
if(!req.isAuthenticated()){
        req.flash("error","you must be logged In to create a listing.");
       return res.redirect("/login");
    }
    next();
}; 