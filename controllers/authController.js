const User = require("../models/User");
const bcrypt = require("bcryptjs");

exports.registerGet = (req, res) => {
    res.render("register");
};

exports.loginGet = (req, res) => {
    res.render("login");
};
exports.loginPost = async (req, res) => {
    const { username, password } = req.body;

    // Search by username because email is not unique anymore
    const user = await User.findOne({ username });
    if (!user) return res.redirect("/login?error=notfound");

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.redirect("/login?error=wrongpassword");

    req.session.userId = user._id;
    res.redirect("/");
};
exports.registerPost = async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Validation checks
        if (!username || username.length < 3 || password.length < 6) {
            return res.redirect("/register?error=short");
        }

        // Check unique username
        const exists = await User.findOne({ username: username.toLowerCase() });
        if (exists) {
            return res.redirect("/register?error=taken");
        }

        const hashed = await bcrypt.hash(password, 10);

        const user = await User.create({
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password: hashed
        });

        req.session.userId = user._id;
        // Redirect to dashboard with success message
        res.redirect("/?success=welcome");
    } catch (err) {
        console.error(err);
        res.redirect("/register?error=failed");
    }
};
exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.redirect("/login");
    });
};