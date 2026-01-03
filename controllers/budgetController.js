const Budget = require("../models/Budget");
const Transaction = require("../models/Transaction");
const mongoose = require("mongoose");
const User = require("../models/User");

const cleanupOldBudgets = async (userId) => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    await Budget.deleteMany({ 
        user: userId, 
        createdAt: { $lt: threeMonthsAgo } 
    });
};


exports.getBudgets = async (req, res) => {
    try {
        const userId = req.session.userId;
        
            const user = await User.findById(userId);
        const budgets = await Budget.find({ user: userId }).sort({ createdAt: -1 });
        
        const budgetData = await Promise.all(budgets.map(async (b) => {
            const budgetDate = new Date(b.createdAt);
            const startOfMonth = new Date(budgetDate.getFullYear(), budgetDate.getMonth(), 1);
            const endOfMonth = new Date(budgetDate.getFullYear(), budgetDate.getMonth() + 1, 0, 23, 59, 59);

            const spendingData = await Transaction.aggregate([
                { 
                    $match: { 
                        user: new mongoose.Types.ObjectId(userId), 
                        type: "expense",
                        category: { $regex: new RegExp(`^${b.category}$`, "i") }, 
                        date: { $gte: startOfMonth, $lte: endOfMonth } 
                    }
                },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]);

            const currentSpend = spendingData.length > 0 ? spendingData[0].total : 0;
            const percent = b.limit > 0 ? (currentSpend / b.limit) * 100 : 0;

            return {user,
                _id: b._id,
                category: b.category,
                limit: b.limit,
                currentSpend,
                percent,
                isAlert: percent >= 90,
                createdAt: b.createdAt
            };
        }));

        res.render("budget", { user,budgetData });
    } catch (err) {
        res.status(500).send("Server Error");
    }
};

exports.addBudget = async (req, res) => {
    const { category, limit } = req.body;
    try {
        await Budget.create({
            user: req.session.userId,
            category: category.trim().toLowerCase(),
            limit: parseFloat(limit)
        });
        res.redirect("/budget");
    } catch (err) {
        res.status(500).send("Error saving budget");
    }
};

exports.deleteBudget = async (req, res) => {
    try {
        await Budget.findOneAndDelete({ _id: req.params.id, user: req.session.userId });
        res.redirect("/budget");
    } catch (err) {
        res.status(500).send("Error deleting budget");
    }
};