const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET;
const JWT_REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET;

const generateAccessToken = (userID) => {
  return jwt.sign({ userID }, JWT_ACCESS_SECRET, { expiresIn: "1h" });
};

// only stored in the server - http only cookie
const generateRefreshToken = (userID) => {
  return jwt.sign({ userID }, JWT_REFRESH_SECRET, { expiresIn: "30d" });
};

// Post request - receive data from frontend
router.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate the input
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Please provide email and password" });
    }

    const userExists = await User.findOne({ email });

    if (userExists)
      return res.status(400).json({ error: "Email already registered" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 11);

    // Save new user to DB
    const newUser = new User({
      email,
      password: hashedPassword,
    });
    await newUser.save();

    const accessToken = generateAccessToken(newUser._id);
    const refreshToken = generateRefreshToken(newUser._id);

    const userResponse = newUser.toObject();
    delete userResponse.password; // Remove password object from user

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false, // local dev
      sameSite: "Strict",
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    });

    res.status(201).json({
      message: "User created successfully and logged in",
      user: userResponse,
      accessToken,
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
        .json({ error: "Please provide email and password" });
    }
    const user = await User.findOne({ email }).select("+password"); // include the password field

    if (!user)
      return res.status(401).json({ error: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      return res.status(401).json({ error: "Invalid email or password" });

    // generate JWT and return token
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    const userResponse = user.toObject();
    delete userResponse.password;

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false, // local dev
      sameSite: "Strict",
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    });

    res.status(200).json({
      message: "Successfully logged in",
      user: userResponse,
      accessToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken)
      return res.status(401).json({ error: "Refresh token does not exist" });

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    // check if user exists still in db
    const user = await User.findById(decoded.userID);
    if (!user) return res.status(401).json({ error: "User no longer exist" });

    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    setRefreshTokenCookie(newRefreshToken);

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: false, // local dev
      sameSite: "Strict",
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    });

    res.status(200).json({ accessToken: newAccessToken });
  } catch (err) {
    console.error(err);
    res.status(403).json({ error: "Invalid refresh token" });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: false, // local dev
    sameSite: "Strict",
  });

  res.status(200).json({ message: "Successfully logged out" });
});

module.exports = router;
