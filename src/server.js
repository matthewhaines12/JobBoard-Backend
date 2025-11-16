require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jobsRouter = require("./routes/jobs");
const authRouter = require("./routes/auth");
const savedJobsRouter = require("./routes/users");
const Job = require("./models/Job");
// const User = require("./models/User");

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

const allowedOrigins = [
  "http://localhost:5173", // local development
  process.env.CLIENT_URL, // production
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use("/api/jobs", jobsRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", savedJobsRouter);

app.get("/", (req, res) => {
  res.send("Job Board Backend is running");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
