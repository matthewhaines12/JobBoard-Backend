require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jobsRouter = require("./routes/jobs");
const authRouter = require("./routes/auth");
const Job = require("./models/Job");
const User = require("./models/User");

const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    Job.countDocuments().then((count) => {
      console.log(`Current job count in database: ${count}`);
    });
  })
  .catch((err) => console.error("MongoDB connection error:", err));

app.use(cors());
app.use(express.json());
app.use("/api/jobs", jobsRouter);
app.use("/api/auth", authRouter);

app.get("/", (req, res) => {
  res.send("Job Board Backend is running");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
