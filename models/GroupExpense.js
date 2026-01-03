const mongoose = require("mongoose");

const GroupExpenseSchema = new mongoose.Schema({
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    description: { type: String, required: true },
    totalAmount: { type: Number, required: true },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    splitType: { type: String, enum: ["equal", "unequal"], default: "equal" },
    // Stores how much each person owes
    splits: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        amount: { type: Number, required: true }
    }],
    date: { type: Date, default: Date.now },
    isSettlement: { type: Boolean, default: false }, // New field
    paidTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
});


module.exports = mongoose.model("GroupExpense", GroupExpenseSchema);