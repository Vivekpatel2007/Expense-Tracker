const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();

const auth = require("../controllers/authController");
const main = require("../controllers/mainController");

// --- 1. PUBLIC ROUTES (Accessible without login) ---
router.get("/login", auth.loginGet);
router.post("/login", auth.loginPost);
router.get("/register", auth.registerGet);
router.post("/register", auth.registerPost);

// --- 2. THE GATEKEEPER ---
// This middleware runs for every route defined BELOW it.
router.use((req, res, next) => {
    if (!req.session.userId) {
        return res.redirect("/login");
    }
    next();
});

// --- 3. PROTECTED ROUTES ---
// Everything below this line requires a session.
router.get("/", main.dashboard);
router.get("/income", main.incomePage);
router.get("/expense", main.expensePage);
router.post("/transaction/stop/:id", main.stopRecurring);
router.post("/transaction", main.addTransaction);
router.delete('/transaction/:id', main.deleteTransaction);
router.get("/all-transactions", main.allTransactionsPage);
router.post("/scan-receipt", upload.single("receipt"), main.scanReceipt);
router.get("/logout", auth.logout); // Moved logout here for safety

// --- 4. PROTECTED SUB-MODULES ---
// By nesting these here, they inherit the Gatekeeper protection.
router.use("/budget", require("./budgetRoutes"));
router.use("/groups", require("./groupRoutes"));

module.exports = router;