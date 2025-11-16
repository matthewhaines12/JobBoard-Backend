const express = require("express");
const router = express.Router();
const Job = require("../models/Job");

router.get("/", async (req, res) => {
  try {
    const {
      query = "",
      location = "",
      sort_by = "relevance",
      employment_type = "",
      remote = "",
      min_salary,
      max_salary,
      date_posted = "",
      experience = "",
      field = "",
      deadline = "",
      type = "",
      limit = 25,
      page = 1,
    } = req.query;

    const filters = {};

    if (query && query.trim() !== "") {
      const queryRegex = new RegExp(query.trim(), "i");
      filters.$or = [
        { job_title: queryRegex },
        { job_description: queryRegex },
        { employer_name: queryRegex },
        { job_category: queryRegex },
      ];
    }

    if (location && location.trim() !== "") {
      const locationTerms = location.split(",").map((term) => term.trim());
      const locationFilters = [];

      locationTerms.forEach((term) => {
        const termRegex = new RegExp(term, "i");
        locationFilters.push(
          { job_city: termRegex },
          { job_state: termRegex },
          { job_country: termRegex },
          { job_location: termRegex }
        );
      });

      if (locationFilters.length > 0) {
        filters.$or = filters.$or
          ? [...filters.$or, ...locationFilters]
          : locationFilters;
      }
    }

    const employmentTypeToFilter = employment_type || type;
    if (employmentTypeToFilter && employmentTypeToFilter.trim() !== "") {
      const typeMapping = {
        "full-time": "FULLTIME",
        "part-time": "PARTTIME",
        contract: "CONTRACTOR",
        contractor: "CONTRACTOR",
        temporary: "TEMPORARY",
        internship: "INTERN",
        freelance: "FREELANCE",
        consultant: "CONSULTANT",
      };

      const mappedType =
        typeMapping[employmentTypeToFilter.toLowerCase()] ||
        employmentTypeToFilter.toUpperCase();
      filters.job_employment_type = new RegExp(mappedType, "i");
    }

    if (remote && remote.trim() !== "") {
      switch (remote.toLowerCase()) {
        case "remote":
          filters.job_is_remote = true;
          break;
        case "onsite":
          filters.job_is_remote = false;
          break;
        case "hybrid":
          const hybridRegex = new RegExp("hybrid", "i");
          filters.$and = filters.$and || [];
          filters.$and.push({
            $or: [{ job_title: hybridRegex }, { job_description: hybridRegex }],
          });
          break;
      }
    }

    if (min_salary || max_salary) {
      const salaryFilter = {};

      if (min_salary) {
        salaryFilter.$or = salaryFilter.$or || [];
        salaryFilter.$or.push(
          { job_max_salary: { $gte: parseInt(min_salary) } },
          { job_min_salary: { $gte: parseInt(min_salary) } }
        );
      }

      if (max_salary) {
        salaryFilter.$and = salaryFilter.$and || [];
        salaryFilter.$and.push({
          $or: [
            { job_min_salary: { $lte: parseInt(max_salary) } },
            { job_max_salary: { $lte: parseInt(max_salary) } },
            { job_min_salary: null },
            { job_max_salary: null },
          ],
        });
      }

      Object.assign(filters, salaryFilter);
    }

    const datePostedToFilter = date_posted || deadline;
    if (datePostedToFilter && datePostedToFilter.trim() !== "") {
      const now = new Date();
      let dateThreshold;

      switch (datePostedToFilter.toLowerCase()) {
        case "1d":
        case "today":
          dateThreshold = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
          break;
        case "3d":
        case "3-days":
          dateThreshold = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
          break;
        case "7d":
        case "week":
        case "this-week":
          dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "14d":
          dateThreshold = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
        case "month":
        case "this-month":
          dateThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      if (dateThreshold) {
        filters.job_posted_at_datetime_utc = {
          $gte: dateThreshold.toISOString(),
        };
      }
    }

    if (experience && experience.trim() !== "") {
      const experienceRegex = new RegExp(experience, "i");
      filters.$and = filters.$and || [];
      filters.$and.push({
        $or: [
          { job_title: experienceRegex },
          { job_required_experience: experienceRegex },
        ],
      });
    }

    if (field && field.trim() !== "") {
      const fieldRegex = new RegExp(field, "i");
      filters.$and = filters.$and || [];
      filters.$and.push({
        $or: [{ job_industry: fieldRegex }, { job_category: fieldRegex }],
      });
    }

    let sortOptions = {};
    switch (sort_by) {
      case "date":
        sortOptions = { job_posted_at_datetime_utc: -1 };
        break;
      case "salary_high":
        sortOptions = { job_max_salary: -1, job_min_salary: -1 };
        break;
      case "salary_low":
        sortOptions = { job_min_salary: 1, job_max_salary: 1 };
        break;
      case "company":
        sortOptions = { employer_name: 1 };
        break;
      case "relevance":
      default:
        sortOptions = { job_posted_at_datetime_utc: -1 };
        break;
    }

    const skipAmount = (parseInt(page) - 1) * parseInt(limit);

    const jobs = await Job.find(filters)
      .sort(sortOptions)
      .skip(skipAmount)
      .limit(parseInt(limit))
      .lean();

    const totalCount = await Job.countDocuments(filters);

    res.json({
      jobs,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total_jobs: totalCount,
        total_pages: Math.ceil(totalCount / parseInt(limit)),
      },
      filters_applied: {
        query: query || null,
        location: location || null,
        employment_type: employmentTypeToFilter || null,
        remote: remote || null,
        salary_range:
          min_salary || max_salary
            ? { min: min_salary, max: max_salary }
            : null,
        date_posted: datePostedToFilter || null,
        sort_by: sort_by,
      },
    });
  } catch (err) {
    console.error("Error fetching jobs:", err.message);
    res.status(500).json({
      error: "Error fetching jobs from database",
      details: err.message,
    });
  }
});

router.get("/count", async (req, res) => {
  try {
    const count = await Job.countDocuments();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: "Error counting jobs" });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const totalJobs = await Job.countDocuments();
    const remoteJobs = await Job.countDocuments({ job_is_remote: true });
    const jobsWithSalary = await Job.countDocuments({
      $or: [
        { job_min_salary: { $ne: null } },
        { job_max_salary: { $ne: null } },
      ],
    });

    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentJobs = await Job.countDocuments({
      job_posted_at_datetime_utc: { $gte: lastWeek.toISOString() },
    });

    const topLocations = await Job.aggregate([
      { $match: { job_city: { $ne: null, $ne: "" } } },
      { $group: { _id: "$job_city", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const topCompanies = await Job.aggregate([
      { $match: { employer_name: { $ne: null, $ne: "" } } },
      { $group: { _id: "$employer_name", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const employmentTypes = await Job.aggregate([
      { $match: { job_employment_type: { $ne: null, $ne: "" } } },
      { $group: { _id: "$job_employment_type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      total_jobs: totalJobs,
      remote_jobs: remoteJobs,
      jobs_with_salary: jobsWithSalary,
      recent_jobs: recentJobs,
      top_locations: topLocations.map((loc) => ({
        city: loc._id,
        count: loc.count,
      })),
      top_companies: topCompanies.map((comp) => ({
        company: comp._id,
        count: comp.count,
      })),
      employment_types: employmentTypes.map((type) => ({
        type: type._id,
        count: type.count,
      })),
      percentages: {
        remote_percentage:
          totalJobs > 0 ? Math.round((remoteJobs / totalJobs) * 100) : 0,
        salary_percentage:
          totalJobs > 0 ? Math.round((jobsWithSalary / totalJobs) * 100) : 0,
        recent_percentage:
          totalJobs > 0 ? Math.round((recentJobs / totalJobs) * 100) : 0,
      },
    });
  } catch (err) {
    console.error("Error getting job statistics:", err.message);
    res.status(500).json({ error: "Error getting job statistics" });
  }
});

module.exports = router;
