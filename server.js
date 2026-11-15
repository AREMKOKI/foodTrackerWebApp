const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 7777;
const FOODS_FILE = path.join(__dirname, "public", "foods.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// POST endpoint to append a new food directly into foods.json
app.post("/api/foods", (req, res) => {
  const newFood = req.body;

  if (!newFood || !newFood.name) {
    return res.status(400).json({ error: "Invalid food data" });
  }

  fs.readFile(FOODS_FILE, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading foods.json:", err);
      return res.status(500).json({ error: "Failed to read database" });
    }

    let foods = [];
    try {
      foods = JSON.parse(data);
    } catch (parseErr) {
      return res.status(500).json({ error: "Invalid JSON format in foods.json" });
    }

    foods.push(newFood);

    fs.writeFile(FOODS_FILE, JSON.stringify(foods, null, 4), (writeErr) => {
      if (writeErr) {
        console.error("Error writing foods.json:", writeErr);
        return res.status(500).json({ error: "Failed to save food" });
      }
      res.status(201).json({ message: "Food added successfully", food: newFood });
    });
  });
});

// Explicit root route to serve index.html on Render
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});