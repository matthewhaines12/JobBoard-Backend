const express = require("express");
const router = express.Router();
const User = require("../models/User");
const verifyAccessToken = require("../middleware/verifyAccessToken");

// Middleware for all routes below
router.use(verifyAccessToken);

// get all saved jobs for logged-in user
router.get("/saved-jobs", async (req, res) => {
  try {
    const userID = req.body.userID; // from verifyAccessToken middleware
    const user = await User.findOne(userID);

    if (!user) return res.status(404).json({ error: "User doesn't exist" });

    res.status(200).json({ savedJobs: user.savedJobs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// save a job
router.post("/save-jobs/:jobID", async (req, res) => {
  const jobID = req.body.jobID;
  const user = await User.findOne(userID);

  if (!user) return res.status(401).json({ error: "User doesn't exist" });
});

// remove a saved job
router.delete("/saved-jobs/:jobID", async (req, res) => {
  const jobID = req.body.jobID;
  const user = await User.findOne(userID);

  if (!user) return res.status(401).json({ error: "User doesn't exist" });
});

module.exports = router;
