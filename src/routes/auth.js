const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");

const JWT_ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET;
const JWT_REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET;
const JWT_EMAIL_SECRET = process.env.EMAIL_TOKEN_SECRET;
const CLIENT_URL = process.env.CLIENT_URL;

const generateAccessToken = (userID) => {
  return jwt.sign({ userID }, JWT_ACCESS_SECRET, { expiresIn: "30m" });
};

// only stored in the server - http only cookie
const generateRefreshToken = (userID) => {
  return jwt.sign({ userID }, JWT_REFRESH_SECRET, { expiresIn: "30d" });
};

const generateEmailToken = (userID) => {
  return jwt.sign({ userID }, JWT_EMAIL_SECRET, { expiresIn: "10m" });
};

const isValidPassword = (password) => {
  if (password.length < 10) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[^a-zA-Z0-9]/.test(password)) return false;
  return true;
};

// Post request - receive data from frontend
router.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate the input
    if (!email || !password)
      return res
        .status(400)
        .json({ error: "Please provide email and password" });

    if (!isValidPassword(password))
      return res.status(400).json({
        error:
          "Password must be at least 10 characters, contain one uppercase letter, one lowercase letter, one number, and one special character",
      });

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

    // Verify email
    const emailToken = generateEmailToken(newUser._id);
    const verificationURL = `${CLIENT_URL}/verify-email?token=${emailToken}`;

    await sendEmail({
      to: newUser.email,
      subject: "Verify your JobBoard account",
      html: `<p>Please click the link below to verify your email:</p>
           <a href="${verificationURL}">${verificationURL}</a>`,
    });

    res.status(201).json({
      message:
        "Signup successful. Please check your email to verify your account before logging in",
      email: newUser.email,
      needsVerification: true,
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

    if (!user.verified) {
      return res.status(403).json({
        error: "Please verify your email before logging in",
        needsVerification: true,
      });
    }

    // generate JWT and return token
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    const userResponse = user.toObject();
    delete userResponse.password;

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // true in production
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
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

    if (!refreshToken) return res.status(204).end(); // Silent failure for missing token

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    // check if user exists still in db
    const user = await User.findById(decoded.userID);
    if (!user) return res.status(401).json({ error: "User no longer exist" });

    if (!user.verified) {
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      });
      return res.status(403).json({
        error: "Email verification required",
        needsVerification: true,
      });
    }

    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    });

    res.status(200).json({ accessToken: newAccessToken, user });
  } catch (err) {
    console.error(err);
    res.status(403).json({ error: "Invalid refresh token" });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
  });

  res.status(200).json({ message: "Successfully logged out" });
});

router.get("/verify-email", async (req, res) => {
  try {
    const emailToken = req.query.token;

    if (!emailToken) return res.status(401).json({ error: "Token is missing" });

    const decoded = jwt.verify(emailToken, JWT_EMAIL_SECRET);

    const user = await User.findByIdAndUpdate(
      decoded.userID,
      { verified: true },
      { new: true }
    );

    if (!user) return res.status(401).json({ error: "User doesn't exist" });

    res.status(200).json({ message: "Email is verified" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// *** resend verification endpoint post with email - later feature ***
// *** reset password and MFA - later feature

module.exports = router;
