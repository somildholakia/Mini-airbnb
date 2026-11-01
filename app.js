if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const ExpressError = require("./utils/ExpressError.js");

const app = express();
const PORT = Number(process.env.PORT) || 8080;
const MONGO_URL = process.env.ATLASTDB_URL;
const SESSION_SECRET = process.env.SECRET;

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// Keep liveness independent from MongoDB so Render can distinguish a live
// process from database readiness.
app.get("/health", (_req, res) => {
    res.status(200).json({
        status: "ok",
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

app.get("/ready", (_req, res) => {
    const databaseReady = mongoose.connection.readyState === 1;
    res.status(databaseReady ? 200 : 503).json({
        status: databaseReady ? "ready" : "not-ready",
        database: databaseReady ? "connected" : "disconnected",
        timestamp: new Date().toISOString()
    });
});

async function configureApplication() {
    const store = MongoStore.create({
        mongoUrl: MONGO_URL,
        crypto: { secret: SESSION_SECRET },
        touchAfter: 24 * 60 * 60
    });

    store.on("error", (error) => {
        console.error("Mongo session store error:", error.message);
    });

    app.use(session({
        store,
        secret: SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production"
        }
    }));

    app.use(flash());
    app.use(passport.initialize());
    app.use(passport.session());

    passport.use(new LocalStrategy(User.authenticate()));
    passport.serializeUser(User.serializeUser());
    passport.deserializeUser(User.deserializeUser());

    app.use((req, res, next) => {
        res.locals.success = req.flash("success");
        res.locals.error = req.flash("error");
        res.locals.currUser = req.user;
        next();
    });

    app.get("/", (_req, res) => res.redirect("/listings"));
    app.use("/listings", listingRouter);
    app.use("/listings/:id/reviews", reviewRouter);
    app.use("/", userRouter);

    app.use((req, res, next) => {
        next(new ExpressError(404, "Page not found"));
    });

    app.use((error, req, res, next) => {
        if (res.headersSent) return next(error);

        const statusCode = error.statusCode || 500;
        const message = statusCode >= 500
            ? "Something went wrong. Please try again."
            : error.message || "Request failed.";

        if (statusCode >= 500) {
            console.error("Request failed:", error.message);
        }

        res.status(statusCode).render("error.ejs", { message });
    });
}

async function startServer() {
    if (!MONGO_URL) {
        throw new Error("Missing ATLASTDB_URL environment variable.");
    }

    if (!SESSION_SECRET) {
        throw new Error("Missing SECRET environment variable.");
    }

    await mongoose.connect(MONGO_URL, {
        serverSelectionTimeoutMS: 15000,
        maxPoolSize: 10
    });
    console.log("Connected to MongoDB.");

    await configureApplication();

    const server = app.listen(PORT, "0.0.0.0", () => {
        console.log("WanderSite is listening on port " + PORT + ".");
    });

    const shutdown = (signal) => {
        console.log(signal + " received. Shutting down gracefully.");
        server.close(async () => {
            await mongoose.disconnect();
            process.exit(0);
        });

        setTimeout(() => process.exit(1), 10000).unref();
    };

    process.once("SIGTERM", () => shutdown("SIGTERM"));
    process.once("SIGINT", () => shutdown("SIGINT"));
}

startServer().catch((error) => {
    // Never print connection strings or secret environment variables.
    console.error("WanderSite startup failed:", error.message);
    process.exit(1);
});
