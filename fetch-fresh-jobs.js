#!/usr/bin/env node
const axios = require("axios");

async function fetchFreshJobs() {
  try {
    console.log("🔥 FETCHING FRESH JOBS");
    console.log("");

    let count = await axios.get("http://localhost:3001/api/jobs/count");
    console.log(`📊 Current jobs in database: ${count.data.count}`);
    console.log("");

    // Fresh search terms to avoid duplicates
    const freshSearches = [
      { query: "marketing coordinator", location: "United States", pages: 2 },
      { query: "business analyst", location: "California", pages: 2 },
      { query: "customer success manager", location: "Texas", pages: 2 },
      { query: "operations manager", location: "New York", pages: 2 },
      { query: "human resources specialist", location: "Florida", pages: 1 },
    ];

    let totalNewJobs = 0;
    let totalApiCalls = 0;

    for (const search of freshSearches) {
      console.log(`🔍 Fetching: ${search.query} in ${search.location}`);

      try {
        const response = await axios.post(
          "http://localhost:3001/api/jobs/fetch",
          search
        );

        totalApiCalls += search.pages;
        totalNewJobs += response.data.inserted;

        console.log(
          `   ✅ ${response.data.inserted} new jobs (${response.data.duplicates} duplicates skipped)`
        );
        console.log(
          `   📊 API calls used: ${response.data.apiCallsUsed || search.pages}`
        );

        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (error) {
        console.log(
          `   ❌ Error: ${error.response?.data?.error || error.message}`
        );
      }
    }

    count = await axios.get("http://localhost:3001/api/jobs/count");
    console.log("");
    console.log("🎉 FRESH JOB FETCH COMPLETE!");
    console.log(`📈 Total jobs now: ${count.data.count}`);
    console.log(`✅ New jobs added: ${totalNewJobs}`);
    console.log(`🔄 Total API calls used: ${totalApiCalls}`);
    console.log(
      `📅 API calls remaining: ~${200 - totalApiCalls - 2} (estimated)`
    );
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
  }
}

fetchFreshJobs();
