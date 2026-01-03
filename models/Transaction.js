const mongoose = require("mongoose");
const TransactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["income", "expense"], required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    
    // RECURRING FIELDS
    isRecurring: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }, // To "Stop" recurring
    frequency: { type: String, enum: ["daily", "weekly", "monthly", "yearly", "none"], default: "none" },
    nextOccurrence: { type: Date } // When the next catch-up should happen
});

module.exports = mongoose.model("Transaction", TransactionSchema);