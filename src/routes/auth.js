const express = require("express");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

const router = express.Router();
dotenv.config();

const secretKey = process.env.ACCESS_TOKEN_SECRET;

const generateAccessToken = (user) => {
  const payload = {
    userID: user._id,
  };
  return jwt.sign(payload, secretKey, { expiresIn: "1h" });
};

// Post request - receive data from frontend
router.post("/signup", async (req, res) => {
  try {
    console.log("Entering the signup route");
    const { email, password } = req.body;

    // Validate the input
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Please provde email and password" });
    }

    const userExists = await User.findOne({ email });

    if (userExists)
      return res.status(400).json({ error: "Email already registered" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 11);

    // Save new user to DB
    const newUser = new User({
      email: email,
      password: hashedPassword,
    });
    await newUser.save();

    const token = generateAccessToken(newUser);

    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.status(201).json({
      message: "User created successfully and logged in",
      user: userResponse,
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate the input
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Please provde email and password" });
    }
    const user = await User.findOne({ email }).select("+password"); // include the password field

    if (!user)
      return res.status(401).json({ error: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      return res.status(401).json({ error: "Invalid email or password" });

    // generate JWT and return token
    const token = generateAccessToken(user);

    const userResponse = user.toObject();
    delete userResponse.password;

    // console.log("token: ", token);
    res.json({ message: "Login successful", user: userResponse, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
