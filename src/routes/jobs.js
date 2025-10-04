const express = require("express");
const router = express.Router();
const bodyParser = express.json();
router.use(bodyParser);

let jobs = [
  { id: 1, title: "Frontend Developer", company: "Acme", location: "Remote" },
];

router.get("/", (req, res) => {
  res.json(jobs);
});

router.post("/", (req, res) => {
  const newJob = { id: Date.now(), ...req.body };
  jobs.push(newJob);
  res.status(201).json(newJob);
});

router.delete("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  jobs = jobs.filter((j) => j.id !== id);
  res.status(204).send();
});

module.exports = router;
