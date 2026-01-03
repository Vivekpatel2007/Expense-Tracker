const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true }, // Username MUST be unique
    email: { type: String, required: true, unique: false },  // Email is NO LONGER unique
    password: { type: String, required: true }
});

module.exports = mongoose.model("User", UserSchema);