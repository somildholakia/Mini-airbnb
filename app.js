if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

const express = require("express");
const helmet = require("helmet");
const security = require("./security.js");
const http = require("http");
const { Server: SocketIOServer } = require("socket.io");
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
const server = http.createServer(app);
const io = new SocketIOServer(server, {
    transports: ["websocket"],
    pingInterval: 4 * 60 * 1000,
    pingTimeout: 30 * 1000,
    connectTimeout: 10 * 1000,
    allowRequest(req, callback) {
        const origin = req.headers.origin;
        const host = req.headers.host;

        if (!origin || !host) return callback(null, false);

        try {
            callback(null, new URL(origin).host === host);
        } catch {
            callback(null, false);
        }
    }
});

// Render Free counts incoming WebSocket messages as activity.
// This same-origin socket keeps active browser sessions responsive.
io.on("connection", (socket) => {
    let lastKeepalive = 0;

    socket.on("site:keepalive", () => {
        const now = Date.now();
        if (now - lastKeepalive < 60 * 1000) return;
        lastKeepalive = now;
        socket.emit("site:keepalive:ack");
    });
});
const PORT = Number(process.env.PORT) || 8080;
const MONGO_URL = process.env.ATLASTDB_URL;
const SESSION_SECRET = process.env.SECRET;
let appReady = false;

app.disable("x-powered-by");
app.set("trust proxy", 1);

// Keep existing CDN assets working while applying Helmet security headers.
// A strict CSP needs a separate nonce/hash rollout across the current templates.
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);

app.use(express.urlencoded({ extended: true, limit: "32kb", parameterLimit: 100 }));
app.use(express.json({ limit: "32kb" }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// Liveness intentionally does not depend on MongoDB. Render can still reach
// this route while the database is temporarily unavailable.
app.get("/health", (_req, res) => {
    res.status(200).json({
        status: "ok",
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

// Readiness requires both application setup and an active MongoDB connection.
app.get("/ready", (_req, res) => {
    const databaseReady = appReady && mongoose.connection.readyState === 1;
    res.status(databaseReady ? 200 : 503).json({
        status: databaseReady ? "ready" : "not-ready",
        database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
        timestamp: new Date().toISOString()
    });
});

// Keep normal application requests out until the database/session middleware
// has been configured. Health and readiness remain available during startup.
app.use((req, res, next) => {
    if (!appReady) {
        return res.status(503).json({
            status: "starting",
            message: "WanderSite is starting or reconnecting to its database."
        });
    }
    next();
});

async function configureApplication() {
    const store = MongoStore.create({
        mongoUrl: MONGO_URL,
        crypto: { secret: SESSION_SECRET },
        touchAfter: 24 * 60 * 60
    });

    store.on("error", (error) => {
        console.error("Mongo session store error:", error.name || "UnknownError");
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
    app.get("/privacy", (_req, res) => {
        res.locals.pageTitle = "Privacy notice · WanderSite";
        res.locals.metaDescription = "How WanderSite handles account, saved-stay, review and listing information.";
        res.render("legal/privacy.ejs");
    });
    app.get("/terms", (_req, res) => {
        res.locals.pageTitle = "Terms of use · WanderSite";
        res.locals.metaDescription = "Terms for using WanderSite's editorial hotel directory and community listings.";
        res.render("legal/terms.ejs");
    });
    app.use("/listings", security.browseLimiter, listingRouter);
    app.use("/listings/:id/reviews", reviewRouter);
    app.use("/", userRouter);

    app.use((req, res, next) => {
        next(new ExpressError(404, "Page not found"));
    });

    app.use((error, req, res, next) => {
        if (res.headersSent) return next(error);

        const isMulterError = error?.name === "MulterError" || String(error?.code || "").startsWith("LIMIT_");
        const statusCode = isMulterError
            ? (error.code === "LIMIT_FILE_SIZE" ? 413 : 400)
            : (error.statusCode || error.status || 500);
        const message = isMulterError && error.code === "LIMIT_FILE_SIZE"
            ? "That photo is too large. Please upload an image smaller than 8 MB."
            : statusCode >= 500
                ? "Something went wrong. Please try again."
                : error.message || "Request failed.";

        if (statusCode >= 500) {
            console.error("Request failed:", error.name || "UnknownError");
        }

        res.status(statusCode).render("error.ejs", { message });
    });
}

function delay(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function connectAndConfigureWithRetry() {
    while (!appReady) {
        try {
            if (!MONGO_URL) {
                throw new Error("Missing ATLASTDB_URL environment variable.");
            }

            if (!SESSION_SECRET) {
                throw new Error("Missing SECRET environment variable.");
            }

            if (mongoose.connection.readyState !== 1) {
                await mongoose.connect(MONGO_URL, {
                    serverSelectionTimeoutMS: 15000,
                    maxPoolSize: 10
                });
            }

            await configureApplication();
            appReady = true;
            console.log("WanderSite application is ready.");
        } catch (error) {
            // Do not log connection strings, credentials, or raw driver errors.
            console.error("WanderSite startup/recovery failed:", error.name || "UnknownError");
            if (mongoose.connection.readyState !== 0) {
                await mongoose.disconnect().catch(() => undefined);
            }
            await delay(5000);
        }
    }
}

function startServer() {
    server.listen(PORT, "0.0.0.0", () => {
        console.log("WanderSite is listening on port " + PORT + ".");
    });

    const shutdown = (signal) => {
        console.log(signal + " received. Shutting down gracefully.");
        io.close(async () => {
            await mongoose.disconnect().catch(() => undefined);
            process.exit(0);
        });

        setTimeout(() => process.exit(1), 10000).unref();
    };

    process.once("SIGTERM", () => shutdown("SIGTERM"));
    process.once("SIGINT", () => shutdown("SIGINT"));

    // Start accepting liveness checks immediately, then retry DB initialization.
    connectAndConfigureWithRetry().catch((error) => {
        console.error("Unexpected startup failure:", error.name || "UnknownError");
    });
}

startServer();
