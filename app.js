require("dotenv").config();
require("./utils/cronWorker");
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const socketIo = require("socket.io");
const path = require("path");

// Models
const User = require("./models/User");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// -------------------------------
//  DATABASE CONNECTION
// -------------------------------
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/spendsync")
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.error("DB Error:", err));


// -------------------------------
//  MIDDLEWARE
// -------------------------------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Public folder
app.use(express.static(path.join(__dirname, "public")));

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.set("trust proxy", 1);

// Session configuration
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || "dev_secret_key", // Use .env for this!
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === "production", 
        httpOnly: true, 
        maxAge: 24 * 60 * 60 * 1000 
    },
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI })
});

app.use(sessionMiddleware);

// Share session with socket.io
io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});


// -------------------------------
//  ROUTES
// -------------------------------
// Add this line under your other route registrations
app.use("/", require("./routes/mainRoutes"));
app.use("/budget", require("./routes/budgetRoutes"));
app.use("/groups", require("./routes/groupRoutes")); // <--- Add this line


// -------------------------------
//  START SERVER
// -------------------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

