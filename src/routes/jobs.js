const express = require("express");
const axios = require("axios");
const Job = require("../models/Job");

const router = express.Router();

// GET /api/jobs - Search jobs from database
router.get("/", async (req, res) => {
  try {
    const { title, location, employmentType } = req.query;
    const filters = {};

    if (title) filters.job_title = new RegExp(title, "i");
    if (location) filters.job_location = new RegExp(location, "i");
    if (employmentType) filters.job_employment_type = employmentType;

    const jobs = await Job.find(filters).sort({
      job_posted_at_datetime_utc: -1,
    });

    res.json(jobs);
  } catch (err) {
    console.error("❌ Error fetching jobs:", err.message);
    res.status(500).json({ error: "Error fetching jobs from database" });
  }
});

// POST /api/jobs/fetch - Fetch jobs from JSearch API
router.post("/fetch", async (req, res) => {
  try {
    const {
      query = "software developer",
      location = "United States",
      pages = 2,
    } = req.body;

    console.log(`🔍 Fetching "${query}" jobs for ${location}...`);

    // Check existing jobs to report duplicate count
    const existingCount = await Job.countDocuments({
      $or: [
        { job_title: new RegExp(query.split(" ")[0], "i") },
        {
          job_title: new RegExp(
            query.split(" ")[1] || query.split(" ")[0],
            "i"
          ),
        },
      ],
    });

    console.log(`📊 Existing jobs matching "${query}": ${existingCount}`);

    const allJobs = [];
    let apiCallsUsed = 0;

    for (let page = 1; page <= pages; page++) {
      // Use varied search terms to get diverse results
      const searchVariations = [
        `${query} in ${location}`,
        `${query} jobs ${location}`,
        `${query} careers ${location}`,
        `${query} opportunities ${location}`,
      ];

      const searchQuery = searchVariations[page % searchVariations.length];

      const options = {
        method: "GET",
        url: "https://jsearch.p.rapidapi.com/search",
        params: {
          query: searchQuery,
          page: page.toString(),
          num_pages: "1",
          date_posted: "today",
        },
        headers: {
          "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        },
      };

      console.log(`📡 API call ${page}: "${searchQuery}"`);
      const response = await axios.request(options);
      apiCallsUsed++;

      const apiJobs = response.data.data;

      if (!apiJobs || apiJobs.length === 0) {
        console.log(`📄 No jobs found on page ${page}, stopping...`);
        break;
      }

      console.log(
        `📦 Received ${apiJobs.length} jobs from API on page ${page}`
      );

      const formatted = apiJobs.map((job) => ({
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
          job.job_city || job.job_state || job.job_country || location,
        qualifications: job.job_required_skills || [],
        responsibilities: job.job_responsibilities || [],
      }));

      allJobs.push(...formatted);
      await new Promise((r) => setTimeout(r, 1000)); // Rate limiting delay
    }

    console.log(`📊 Total jobs fetched from API: ${allJobs.length}`);

    // Check for existing jobs to prevent duplicates
    const existingJobIds = new Set();
    if (allJobs.length > 0) {
      const jobIds = allJobs.map((job) => job.job_id);
      const existingJobs = await Job.find(
        { job_id: { $in: jobIds } },
        { job_id: 1 }
      );
      existingJobs.forEach((job) => existingJobIds.add(job.job_id));
    }

    console.log(
      `🔍 Found ${existingJobIds.size} existing jobs, filtering them out...`
    );

    // Filter out existing jobs before inserting
    const newJobs = allJobs.filter((job) => !existingJobIds.has(job.job_id));
    console.log(`✨ ${newJobs.length} truly new jobs to insert`);

    let inserted = 0;
    let errors = 0;

    for (const jobData of newJobs) {
      try {
        await Job.create(jobData);
        inserted++;
      } catch (err) {
        if (err.code === 11000) {
          console.log(`⚠️  Unexpected duplicate: ${jobData.job_id}`);
        } else {
          console.error(
            `❌ Error inserting job ${jobData.job_id}:`,
            err.message
          );
          errors++;
        }
      }
    }

    const duplicates = allJobs.length - newJobs.length;

    console.log(
      `✅ Fetch complete: ${inserted} inserted, ${duplicates} duplicates, ${errors} errors`
    );

    res.json({
      message: "Job fetch complete",
      inserted,
      duplicates,
      total: allJobs.length,
      apiCallsUsed,
      newJobsFound: newJobs.length,
    });
  } catch (err) {
    console.error("❌ Error fetching jobs:", err.message);
    res.status(500).json({ error: "Error fetching jobs from API" });
  }
});

// GET /api/jobs/count - Get total job count
router.get("/count", async (req, res) => {
  try {
    const count = await Job.countDocuments();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: "Error counting jobs" });
  }
});

module.exports = router;
