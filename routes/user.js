const express = require("express");
const router = express.Router({mergeParams: true});

router.get("/signup", (req,res) => {
    res.send("form");
})


module.exports = router;