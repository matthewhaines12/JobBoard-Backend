#!/usr/bin/env node
const axios = require("axios");

async function fetchFreshJobs() {
  try {
    console.log("FETCHING FRESH JOBS");
    console.log("");

    let count = await axios.get("http://localhost:3001/api/jobs/count");
    console.log(`Current jobs in database: ${count.data.count}`);
    console.log("");

    // Diverse search terms to avoid duplicates and get variety
    const freshSearches = [
      { query: "jobs", location: "Allentown", pages: 1 },
      { query: "jobs", location: "Erie", pages: 1 },
      { query: "jobs", location: "Reading", pages: 1 },
      { query: "jobs", location: "Scranton", pages: 1 },
      { query: "careers", location: "Lancaster", pages: 1 },
      { query: "jobs", location: "Nevada", pages: 1 },
      { query: "jobs", location: "Minnesota", pages: 1 },
      { query: "jobs", location: "Wisconsin", pages: 1 },
      { query: "jobs", location: "Missouri", pages: 1 },
      { query: "jobs", location: "Indiana", pages: 1 },
      { query: "flexible schedule", location: "", pages: 1 },
      { query: "competitive salary", location: "", pages: 1 },
      { query: "health insurance", location: "", pages: 1 },
      { query: "401k", location: "", pages: 1 },
      { query: "stock options", location: "", pages: 1 },
    ];

    let totalNewJobs = 0;
    let totalApiCalls = 0;

    for (const search of freshSearches) {
      console.log(`Fetching: ${search.query} in ${search.location}`);

      try {
        const response = await axios.post(
          "http://localhost:3001/api/jobs/fetch",
          search
        );

        totalApiCalls += search.pages;
        totalNewJobs += response.data.inserted;

        console.log(
          `   ${response.data.inserted} new jobs (${response.data.duplicates} duplicates skipped)`
        );
        console.log(
          `   API calls used: ${response.data.apiCallsUsed || search.pages}`
        );

        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (error) {
        console.log(
          `   Error: ${error.response?.data?.error || error.message}`
        );
      }
    }

    count = await axios.get("http://localhost:3001/api/jobs/count");
    console.log("");
    console.log("FRESH JOB FETCH COMPLETE!");
    console.log(`Total jobs now: ${count.data.count}`);
    console.log(`New jobs added: ${totalNewJobs}`);
    console.log(`Total API calls used: ${totalApiCalls}`);
    console.log(`API calls remaining: ~${200 - totalApiCalls - 2} (estimated)`);
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
  }
}

fetchFreshJobs();
