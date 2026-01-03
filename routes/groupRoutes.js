const express = require("express");
const router = express.Router();
const groupController = require("../controllers/groupController");

const isAuth = (req, res, next) => {
    if (!req.session.userId) return res.redirect("/login");
    next();
};

router.get("/", isAuth, groupController.getGroups);
router.post("/create", isAuth, groupController.createGroup);
router.get("/:id", isAuth, groupController.getGroupDetails); // Group Dashboard
router.post("/:id/delete", isAuth, groupController.deleteGroup);
router.post("/:id/add-member", isAuth, groupController.addMember);
router.post("/:groupId/remove-member/:userId", isAuth, groupController.removeMember);

// Expense Routes
router.post("/:id/add-expense", isAuth, groupController.addGroupExpense);
router.get("/:groupId/expense/:expenseId", isAuth, groupController.getExpenseDetail);
router.post("/:groupId/expense/:expenseId/delete", isAuth, groupController.deleteExpense);

// Settlement
router.post("/:id/settle", isAuth, groupController.settlePayment);

module.exports = router;