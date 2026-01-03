const Transaction = require("../models/Transaction");
const User = require("../models/User");
const Budget = require("../models/Budget");
const { processRecurring } = require("../utils/recurringLogic");

const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.isAuth = (req, res, next) => {
    if (!req.session.userId) return res.redirect("/login");
    next();
};

// Get all transactions (Income and Expense)
exports.allTransactionsPage = async (req, res) => {
    try {
        const userId = req.session.userId;
        
    const user = await User.findById(userId);
        // Fetch all transactions for the user, sorted by newest first
        const transactions = await Transaction.find({ user: userId }).sort({ date: -1 });
        
        // Calculate totals for a summary header
        const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
        const expense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

        res.render("allTransactions", { 
            user,
            transactions, 
            income, 
            expense,
            balance: income - expense 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading transactions");
    }
};

exports.dashboard = async (req, res) => {


    const userId = req.session.userId;
    
    const user = await User.findById(userId);
    // RUN RECURRING CHECK BEFORE FETCHING TOTALS
    await processRecurring(userId);

    const transactions = await Transaction.find({ user: userId }).sort({ date: -1 });

    // Existing calculation logic ...
    const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const balance = income - expense;

    // --- NEW: BUDGET ALERT LOGIC ---
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const budgets = await Budget.find({ user: userId });
    
    // Calculate current month spending per category
    const categorySpending = await Transaction.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId), type: "expense", date: { $gte: startOfMonth } } },
        { $group: { _id: "$category", total: { $sum: "$amount" } } }
    ]);

    const alerts = [];
    budgets.forEach(b => {
        const spent = categorySpending.find(s => s._id.toLowerCase() === b.category.toLowerCase());
        if (spent && spent.total >= (b.limit * 0.9)) {
            alerts.push({
                category: b.category,
                percent: Math.round((spent.total / b.limit) * 100),
                isOver: spent.total > b.limit
            });
        }
    });

    res.render("home", {
        user, balance, income, expense,
        transactions, alerts, // Pass alerts here
        incomeTx: transactions.filter(t => t.type === "income"),
        expenseTx: transactions.filter(t => t.type === "expense")
    });
};

exports.incomePage = async (req, res) => {
    const userId = req.session.userId;
    
    const user = await User.findById(userId);
    const transactions = await Transaction.find({ user: userId, type: "income" }).sort({ date: -1 });
    
    // FIX: Added the aggregation for the chart
    const monthlyIncome = await Transaction.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId), type: "income" } },
        { $group: { _id: { month: { $month: "$date" } }, total: { $sum: "$amount" } } }
    ]);
    
    res.render("income", { user,transactions, monthlyIncome });
};

exports.expensePage = async (req, res) => {
    const userId = req.session.userId;
    
    const user = await User.findById(userId);
    const transactions = await Transaction.find({ user: userId, type: "expense" }).sort({ date: -1 });
    res.render("expense", { user,transactions });
};const { catchUpRecurring } = require("../utils/recurringLogic");

exports.addTransaction = async (req, res) => {
    try {
        const { type, category, amount, date, isRecurring, frequency } = req.body;
        const startDate = date ? new Date(date) : new Date();

        // 1. Create the "Parent" or "Anchor" transaction
        const newTx = await Transaction.create({
            user: req.session.userId,
            type,
            category: category.trim().toLowerCase(),
            amount: parseFloat(amount),
            date: startDate,
            isRecurring: isRecurring === "true",
            frequency: isRecurring === "true" ? frequency : "none",
            isActive: isRecurring === "true",
            // Initially set nextOccurrence to startDate; catchUp will move it forward
            nextOccurrence: startDate 
        });

        // 2. If it is recurring, immediately run the backfill logic
        if (newTx.isRecurring) {
            await catchUpRecurring(newTx);
        }

        res.redirect(type === "income" ? "/income" : "/expense");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error adding transaction");
    }
};
exports.stopRecurring = async (req, res) => {
    try {
        await Transaction.findOneAndUpdate(
            { _id: req.params.id, user: req.session.userId },
            { 
                isActive: false, 
                isRecurring: false, // Turn off recurring status
                frequency: "none"   // Reset frequency
            }
        );
        // This takes the user back to the page they came from (Income or Expense)
        res.redirect('/'); 
    } catch (err) {
        console.error(err);
        res.status(500).send("Error stopping recurring transaction");
    }
};
exports.deleteTransaction = async (req, res) => {
    await Transaction.findByIdAndDelete(req.params.id);
    res.status(200).send('Deleted');
};

// ... keep scanReceipt logic as it was ...
exports.scanReceipt = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No image uploaded" });

        // Use 'gemini-1.5-flash' (latest) or 'gemini-1.5-flash-latest'
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = "Analyze this receipt. Return ONLY a JSON object with: { \"amount\": number, \"date\": \"YYYY-MM-DD\", \"category\": \"string\" }. Use one of these categories: food, groceries, utilities, transportation, shopping, bills, miscellaneous. If you can't find a value, use 0 for amount and current date for date.";

        const imagePart = {
            inlineData: {
                data: req.file.buffer.toString("base64"),
                mimeType: req.file.mimetype
            }
        };

        // Important: The arguments must be [prompt, imagePart]
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        // Remove any markdown formatting (```json ... ```)
        const cleanedText = text.replace(/```json|```/gi, "").trim();
        const data = JSON.parse(cleanedText);

        res.json({
            amount: data.amount || 0,
            date: data.date || new Date().toISOString().split('T')[0],
            category: data.category || "miscellaneous"
        });

    } catch (err) {
        console.error("Scanning Error:", err);
        res.status(500).json({ error: "Failed to scan. Ensure the image is clear." });
    }
};