const Group = require("../models/Group");
const GroupExpense = require("../models/GroupExpense");
const User = require("../models/User");

exports.getGroupDetails = async (req, res) => {
    try {
        const userId = req.session.userId;
        
        const user = await User.findById(userId);
        const group = await Group.findById(req.params.id).populate("members", "username");
        if (!group) return res.status(404).send("Group not found");

        const expenses = await GroupExpense.find({ group: req.params.id }).populate("paidBy", "username");

        // Calculate Net Balance for each member
        // Positive = Owed money, Negative = Owes money
        let settlementData = group.members.map(m => ({
            userId: m._id,
            username: m.username,
            netBalance: 0
        }));

        expenses.forEach(exp => {
            // Add full amount to the person who paid
            const payer = settlementData.find(s => s.userId.toString() === exp.paidBy._id.toString());
            if (payer) payer.netBalance += exp.totalAmount;

            // Subtract split amount from each person involved
            exp.splits.forEach(split => {
                const member = settlementData.find(s => s.userId.toString() === split.user.toString());
                if (member) member.netBalance -= split.amount;
            });
        });

        res.render("groupDetails", {
            user, 
            group, 
            expenses, 
            settlementData, 
            currentUser: req.session.userId 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};
exports.deleteGroup = async (req, res) => {
    try {
        const groupId = req.params.id;
        const userId = req.session.userId;
        const group = await Group.findById(groupId);

        if (!group) return res.status(404).send("Group not found");

        if (group.createdBy.toString() === userId.toString()) {
            // Admin deletes the whole group
            await Group.findByIdAndDelete(groupId);
            await GroupExpense.deleteMany({ group: groupId });
            return res.redirect(`/groups?message=deleted`);
        } else {
            // Member tries to leave
            const expenses = await GroupExpense.find({ group: groupId });
            let myBalance = 0;

            expenses.forEach(exp => {
                if (exp.paidBy.toString() === userId.toString()) myBalance += exp.totalAmount;
                const split = exp.splits.find(s => s.user.toString() === userId.toString());
                if (split) myBalance -= split.amount;
            });

            if (Math.abs(myBalance) > 0.01) {
                return res.redirect(`/groups/${groupId}?error=unsettled&amount=${Math.abs(myBalance).toFixed(2)}`);
            }

            group.members = group.members.filter(id => id.toString() !== userId.toString());
            await group.save();
            return res.redirect(`/groups?message=left`);
        }
    } catch (err) {
        res.status(500).send("Error processing request");
    }
};
// ... keep other functions (createGroup, addMember, etc.) as they were
// Get list of all groups user belongs to
exports.getGroups = async (req, res) => {
    try {
        
            const userId = req.session.userId;
            
            const user = await User.findById(userId);
        const groups = await Group.find({ members: req.session.userId });
        res.render("groups", { user,groups ,userId: req.session.userId});
    } catch (err) {
        res.status(500).send("Error loading groups");
    }
};

// Create a new group
exports.createGroup = async (req, res) => {
    try {
        const { name } = req.body;
        await Group.create({
            name,
            createdBy: req.session.userId,
            members: [req.session.userId]
        });
        res.redirect("/groups");
    } catch (err) {
        res.status(500).send("Error creating group");
    }
};


// Add member by username

exports.addMember = async (req, res) => {
    try {
        const { username } = req.body;
        const group = await Group.findById(req.params.id);
        
        // Search lowercase to match your registerPost logic
        const userToAdd = await User.findOne({ username: username.trim().toLowerCase() });

        if (!userToAdd) {
            return res.status(404).json({ success: false, message: "User not found!" });
        }

        // Check if ID is already in members array
        if (group.members.includes(userToAdd._id)) {
            return res.status(400).json({ success: false, message: "User is already in this group" });
        }

        group.members.push(userToAdd._id);
        await group.save();
        
        res.status(200).json({ 
            success: true, 
            message: `${userToAdd.username} added successfully!` 
        });

    } catch (err) {
        res.status(500).json({ success: false, message: "Server error occurred" });
    }
};
// Get individual details for a specific group expense
exports.getExpenseDetail = async (req, res) => {
    try {
        const { groupId, expenseId } = req.params;

        // Find the expense and populate the payer and the users in the splits
        const expense = await GroupExpense.findById(expenseId)
            .populate("paidBy", "username email")
            .populate("splits.user", "username");

        if (!expense) return res.status(404).send("Expense not found");

        res.render("expenseDetail", { 
            expense, 
            groupId,
            currentUser: req.session.userId 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};

// Add Remove Member
exports.removeMember = async (req, res) => {
    try {
        const { groupId, userId } = req.params;
        const currentUserId = req.session.userId;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ success: false, message: "Group not found" });

        // 1. Authorization: Only Admin can remove
        if (group.createdBy.toString() !== currentUserId.toString()) {
            return res.status(403).json({ success: false, message: "Only the admin can remove members" });
        }

        // 2. Settlement Check: Ensure member has zero balance
        const expenses = await GroupExpense.find({ group: groupId });
        let balance = 0;
        
        expenses.forEach(exp => {
            // Add what they paid
            if (exp.paidBy.toString() === userId) balance += exp.totalAmount;
            // Subtract their share
            const split = exp.splits.find(s => s.user.toString() === userId);
            if (split) balance -= split.amount;
        });

        // Use 0.01 tolerance for float math
        if (Math.abs(balance) > 0.01) {
            return res.status(400).json({ 
                success: false, 
                message: `Cannot remove: Member has an unsettled balance of ₹${Math.abs(balance).toFixed(2)}` 
            });
        }

        // 3. Perform Removal
        group.members = group.members.filter(id => id.toString() !== userId);
        await group.save();

        res.status(200).json({ success: true, message: "Member removed" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};
// Add a group expense
exports.addGroupExpense = async (req, res) => {
    try {
        const { description, amount, splitType, unequalAmounts } = req.body;
        const group = await Group.findById(req.params.id);
        const totalAmount = parseFloat(amount);

        // 1. Basic Validation: Amount must be positive
        if (!totalAmount || totalAmount <= 0) {
            return res.status(400).send("Invalid Amount: Must be greater than 0");
        }

        let splits = [];

        if (splitType === "equal") {
            const perPerson = totalAmount / group.members.length;
            splits = group.members.map(memberId => ({ user: memberId, amount: perPerson }));
        } else {
            let sumSplits = 0;
            for (let userId in unequalAmounts) {
                const val = parseFloat(unequalAmounts[userId]) || 0;
                sumSplits += val;
                splits.push({ user: userId, amount: val });
            }

            // 2. Logic Validation: Sum of splits must match total amount
            // We use a small tolerance (0.01) for floating point math
            if (Math.abs(sumSplits - totalAmount) > 0.01) {
                return res.status(400).send(`Split mismatch: Sum (₹${sumSplits.toFixed(2)}) must equal Total (₹${totalAmount.toFixed(2)})`);
            }
        }

        await GroupExpense.create({
            group: group._id,
            description,
            totalAmount,
            paidBy: req.session.userId,
            splitType,
            splits
        });

        res.redirect(`/groups/${req.params.id}`);
    } catch (err) {
        res.status(500).send("Error adding expense");
    }
};

// Record a settlement payment
// ... existing imports
exports.settlePayment = async (req, res) => {
    const { amount, paidToId } = req.body;
    const groupId = req.params.id;
    const payerId = req.session.userId;

    try {
        const expenses = await GroupExpense.find({ group: groupId });
        
        let netBalance = 0;
        expenses.forEach(exp => {
            if (exp.paidBy.toString() === payerId.toString()) netBalance += exp.totalAmount;
            exp.splits.forEach(split => {
                if (split.user.toString() === payerId.toString()) netBalance -= split.amount;
            });
        });

        // FIX: Round the currentDebt to 2 decimal places to handle float errors
        const rawDebt = Math.abs(netBalance < 0 ? netBalance : 0);
        const currentDebt = Math.round(rawDebt * 100) / 100; 

        const inputAmount = parseFloat(amount);

        // Logic Check: Use a small epsilon or rounded values for comparison
        if (inputAmount > (currentDebt + 0.01)) { 
            return res.status(400).send(`Invalid Amount: You only owe ₹${currentDebt.toFixed(2)}`);
        }

        // Create the settlement transaction
        await GroupExpense.create({
            group: groupId,
            description: "Settlement Payment",
            totalAmount: inputAmount,
            paidBy: payerId,
            paidTo: paidToId,
            isSettlement: true,
            splits: [{ user: paidToId, amount: inputAmount }] 
        });

        res.redirect(`/groups/${groupId}`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error recording settlement");
    }
};
// Delete an expense (Secure)
exports.deleteExpense = async (req, res) => {
    try {
        const { groupId, expenseId } = req.params;
        const expense = await GroupExpense.findById(expenseId);

        if (!expense) return res.status(404).send("Expense not found");

        // Only allow the person who paid to delete it
        if (expense.paidBy.toString() !== req.session.userId.toString()) {
            return res.status(403).send("Unauthorized: You can only delete your own entries");
        }

        await GroupExpense.findByIdAndDelete(expenseId);
        res.redirect(`/groups/${groupId}`);
    } catch (err) {
        res.status(500).send("Error deleting expense");
    }

};
