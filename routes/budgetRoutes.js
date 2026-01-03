const express = require("express");
const router = express.Router();
const budgetController = require("../controllers/budgetController");

// Middleware to ensure user is logged in
const isAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect("/login");
    }
    next();
};

// Define Budget Routes
router.get("/", isAuth, budgetController.getBudgets);
router.post("/add", isAuth, budgetController.addBudget);
router.post("/delete/:id", isAuth, budgetController.deleteBudget);

module.exports = router;