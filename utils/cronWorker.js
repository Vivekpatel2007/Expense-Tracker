const cron = require("node-cron");
const Transaction = require("../models/Transaction");

// Utility to check if a new transaction should be generated
const shouldGenerate = (lastDate, frequency) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const last = new Date(lastDate);
    last.setHours(0, 0, 0, 0);

    const diffTime = Math.abs(today - last);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    switch (frequency) {
        case "daily":
            return diffDays >= 1;
        case "weekly":
            return diffDays >= 7;
        case "monthly":
            // Checks if we are in a new month compared to the last generation
            return today.getMonth() !== last.getMonth() || today.getFullYear() !== last.getFullYear();
        case "yearly":
            return today.getFullYear() !== last.getFullYear();
        default:
            return false;
    }
};

// Runs every day at midnight (00:00)
cron.schedule("0 0 * * *", async () => {
    console.log("Checking all recurring transactions...");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
        // Find all active recurring transactions
        const templates = await Transaction.find({ isRecurring: true });

        for (let txn of templates) {
            // Use the original date if it has never been generated before
            const referenceDate = txn.lastGeneratedDate || txn.date;

            if (shouldGenerate(referenceDate, txn.frequency)) {
                // Create the new entry for today
                await Transaction.create({
                    user: txn.user,
                    type: txn.type,
                    category: txn.category,
                    amount: txn.amount,
                    date: today,
                    isRecurring: false, // The copy is a static record
                    frequency: "none"
                });

                // Update the template to mark today as the last run
                txn.lastGeneratedDate = today;
                await txn.save();
                console.log(`Auto-generated ${txn.frequency} ${txn.type}: ${txn.category}`);
            }
        }
    } catch (err) {
        console.error("Automation Error:", err);
    }
});