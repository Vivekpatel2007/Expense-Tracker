const Transaction = require("../models/Transaction");

exports.catchUpRecurring = async (template) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start checking from the day AFTER the template date
    let pointerDate = new Date(template.date);
    
    // Advance the pointer based on frequency to find the first "missed" date
    const advanceDate = (date, freq) => {
        let d = new Date(date);
        if (freq === 'daily') d.setDate(d.getDate() + 1);
        else if (freq === 'weekly') d.setDate(d.getDate() + 7);
        else if (freq === 'monthly') d.setMonth(d.getMonth() + 1);
        else if (freq === 'yearly') d.setFullYear(d.getFullYear() + 1);
        return d;
    };

    pointerDate = advanceDate(pointerDate, template.frequency);

    // Loop through and create transactions until we hit or pass today
    while (pointerDate <= today) {
        await Transaction.create({
            user: template.user,
            type: template.type,
            category: template.category,
            amount: template.amount,
            date: new Date(pointerDate),
            isRecurring: false // These are generated instances, not templates
        });

        pointerDate = advanceDate(pointerDate, template.frequency);
    }

    // Update the template with the next scheduled date in the future
    template.nextOccurrence = pointerDate;
    await template.save();
};
exports.processRecurring = async (userId) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find active recurring templates that are due
    const recurringTemplates = await Transaction.find({
        user: userId,
        isRecurring: true,
        isActive: true,
        nextOccurrence: { $lte: today }
    });

    for (let template of recurringTemplates) {
        let currentNext = new Date(template.nextOccurrence);

        while (currentNext <= today) {
            // 1. Create the automated transaction
            await Transaction.create({
                user: template.user,
                type: template.type,
                category: template.category,
                amount: template.amount,
                date: new Date(currentNext), // Set to the date it was supposed to happen
                isRecurring: false // These are the copies, they aren't templates
            });

            // 2. Advance the date based on frequency
            if (template.frequency === 'daily') currentNext.setDate(currentNext.getDate() + 1);
            else if (template.frequency === 'weekly') currentNext.setDate(currentNext.getDate() + 7);
            else if (template.frequency === 'monthly') currentNext.setMonth(currentNext.getMonth() + 1);
            else if (template.frequency === 'yearly') currentNext.setFullYear(currentNext.getFullYear() + 1);
        }

        // 3. Update the template's nextOccurrence for the future
        template.nextOccurrence = currentNext;
        await template.save();
    }
};