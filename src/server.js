require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jobsRouter = require("./routes/jobs");
const authRouter = require("./routes/auth");
const savedJobsRouter = require("./routes/users");
const Job = require("./models/Job");

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

// CORS Configuration
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      // Allow localhost for development
      if (origin.includes("localhost")) return callback(null, true);

      // Allow all Vercel deployments (production and previews)
      if (origin.includes("vercel.app")) return callback(null, true);

      // Block everything else
      console.error(`CORS blocked: ${origin}`);
      return callback(new Error("Not allowed by CORS policy"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Middleware
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/jobs", jobsRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", savedJobsRouter);

app.get("/", (req, res) => {
  res.send("Job Board Backend is running");
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(500).json({
    error: err.message || "Internal server error",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
