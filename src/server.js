const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const jobsRouter = require("./routes/jobs");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json()); // allows JSON body parsing
app.use("/api/jobs", jobsRouter);

app.get("/", (req, res) => {
  res.send("Job Board Backend is running 🚀");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
