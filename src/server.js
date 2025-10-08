require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jobsRouter = require("./routes/jobs");
const cron = require("node-cron");
const Job = require("./models/Job");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    Job.countDocuments().then((count) => {
      console.log(`📊 Current job count in database: ${count}`);
    });
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));

app.use(cors());
app.use(express.json());
app.use("/api/jobs", jobsRouter);

app.get("/", (req, res) => {
  res.send("Job Board Backend is running 🚀");
});

// Weekly job fetch - Runs every Monday at midnight
cron.schedule("0 0 * * 1", async () => {
  console.log("🕐 Starting weekly NATIONWIDE job fetch...");

  try {
    const weeklySearchTerms = [
      "jobs",
      "employment",
      "careers",
      "hiring",
      "remote work",
      "entry level",
      "full time",
      "part time",
    ];

    const majorStates = [
      "United States",
      "California",
      "Texas",
      "Florida",
      "New York",
      "Pennsylvania",
      "Illinois",
      "Ohio",
      "Georgia",
      "North Carolina",
      "Michigan",
      "Washington",
      "Massachusetts",
      "Virginia",
    ];

    let totalInserted = 0;
    let totalDuplicates = 0;

    for (const searchTerm of weeklySearchTerms) {
      for (const state of majorStates) {
        try {
          console.log(`🔍 Weekly fetch: "${searchTerm}" in ${state}...`);

          // Limit to 5 pages per search to prevent long execution times
          for (let page = 1; page <= 5; page++) {
            const options = {
              method: "GET",
              url: "https://jsearch.p.rapidapi.com/search",
              params: {
                query: `${searchTerm} in ${state}`,
                page: page.toString(),
                num_pages: "1",
              },
              headers: {
                "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
                "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
              },
            };

            const response = await axios.request(options);
            const apiJobs = response.data.data;

            if (!apiJobs || apiJobs.length === 0) {
              break; // No more jobs for this search term/state
            }

            const formattedJobs = apiJobs.map((job) => ({
              job_id: job.job_id,
              employer_name: job.employer_name,
              employer_website: job.employer_website,
              job_employment_type: job.job_employment_type,
              job_title: job.job_title,
              job_apply_link: job.job_apply_link,
              job_description: job.job_description,
              job_posted_human_readable: job.job_posted_human_readable,
              job_posted_at_datetime_utc: job.job_posted_at_datetime_utc,
              job_location:
                job.job_city || job.job_state || job.job_country || state,
              qualifications: job.job_required_skills || [],
              responsibilities: job.job_responsibilities || [],
            }));

            for (const jobData of formattedJobs) {
              try {
                await Job.create(jobData);
                totalInserted++;
              } catch (err) {
                if (err.code === 11000) {
                  totalDuplicates++;
                } else {
                  console.error(
                    `❌ Error inserting job ${jobData.job_id}:`,
                    err.message
                  );
                }
              }
            }

            // Rate limiting delay
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        } catch (error) {
          console.error(
            `❌ Error fetching "${searchTerm}" in ${state}:`,
            error.message
          );
          continue;
        }
      }
    }

    console.log(`✅ Weekly NATIONWIDE job fetch complete!`);
    console.log(`✅ New jobs inserted: ${totalInserted}`);
    console.log(`⚠️ Duplicates skipped: ${totalDuplicates}`);
  } catch (err) {
    console.error("❌ Error during weekly job fetch:", err.message);
    console.error("Full error:", err);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
