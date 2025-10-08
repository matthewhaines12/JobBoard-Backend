const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    job_id: { type: String, unique: true },
    employer_name: String,
    employer_website: String,
    job_employment_type: String,
    job_title: String,
    job_apply_link: String,
    job_description: String,
    job_posted_human_readable: String,
    job_posted_at_datetime_utc: String,
    job_location: String,
    job_salary: String,
    qualifications: [String],
    responsibilities: [String],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Job", jobSchema);
