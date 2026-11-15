let foodDatabase = [];
let selectedDate = formatDateKey(new Date());
let calendarViewDate = new Date();
let selectedMeal = "Breakfast";
let selectedFoodItem = null;
let selectedNewFoodUnit = "nutrition-per-100g";

const MEAL_SECTIONS = ["Breakfast", "Lunch", "Dinner", "Snacks"];

document.addEventListener("DOMContentLoaded", async () => {
  await loadFoodDatabase();
  setupSearchAutocomplete();
  setupAddFoodForm();
  updateDateHeader();
  renderDailyLog();

  // Meal Selector Toggle
  document.querySelectorAll("#meal-selector .meal-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#meal-selector .meal-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedMeal = btn.dataset.meal;
    });
  });

  // Log Form Submission
  document.getElementById("quick-log-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const grams = parseFloat(document.getElementById("food-grams").value);

    if (!selectedFoodItem || !grams || grams <= 0) {
      alert("Please select a valid food from the search dropdown and enter weight in grams/ml.");
      return;
    }

    const nutri = selectedFoodItem["nutrition-per-100g"] || selectedFoodItem["nutrition-per-100ml"] || {};
    const energykJ = parseFloat(nutri.energy || 0);
    const calories = energykJ > 500 ? energykJ / 4.184 : energykJ;
    const protein = parseFloat(nutri.protein || 0);
    const carbs = parseFloat(nutri.carbohydrate || 0);
    const fat = parseFloat(nutri.fat || 0);

    const multiplier = grams / 100;

    const entry = {
      entryId: Date.now(),
      meal: selectedMeal,
      name: selectedFoodItem.name,
      grams,
      calories: calories * multiplier,
      protein: protein * multiplier,
      carbs: carbs * multiplier,
      fat: fat * multiplier
    };

    const logs = getLogs();
    if (!logs[selectedDate]) logs[selectedDate] = [];
    logs[selectedDate].push(entry);
    localStorage.setItem("mealLogs", JSON.stringify(logs));

    document.getElementById("food-search").value = "";
    document.getElementById("food-grams").value = "";
    selectedFoodItem = null;
    renderDailyLog();
  });

  // Clear day logs
  document.getElementById("clear-day-btn").addEventListener("click", () => {
    const logs = getLogs();
    delete logs[selectedDate];
    localStorage.setItem("mealLogs", JSON.stringify(logs));
    renderDailyLog();
  });

  // Date nav
  document.getElementById("prev-day-btn").addEventListener("click", () => changeDate(-1));
  document.getElementById("next-day-btn").addEventListener("click", () => changeDate(1));

  // Calendar nav
  document.getElementById("prev-month-btn").addEventListener("click", () => {
    calendarViewDate.setMonth(calendarViewDate.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById("next-month-btn").addEventListener("click", () => {
    calendarViewDate.setMonth(calendarViewDate.getMonth() + 1);
    renderCalendar();
  });

  // Tab switching
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.target));
  });
});

async function loadFoodDatabase() {
  try {
    // Cache-busting query ensures newly added foods load immediately
    const res = await fetch(`foods.json?t=${Date.now()}`);
    foodDatabase = await res.json();
  } catch (err) {
    console.error("Error loading foods.json:", err);
  }
}

function setupAddFoodForm() {
  // Unit toggle (100g vs 100ml)
  document.querySelectorAll("#new-food-unit-selector .unit-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#new-food-unit-selector .unit-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedNewFoodUnit = btn.dataset.unit;
    });
  });

  const form = document.getElementById("add-food-db-form");
  const feedback = document.getElementById("save-food-feedback");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("new-food-name").value.trim();
    const kcal = parseFloat(document.getElementById("new-food-kcal").value);
    const protein = parseFloat(document.getElementById("new-food-protein").value);
    const carbs = parseFloat(document.getElementById("new-food-carbs").value);
    const fat = parseFloat(document.getElementById("new-food-fat").value);
    const tagsInput = document.getElementById("new-food-tags").value.trim();

    if (!name || isNaN(kcal)) return;

    // Convert kcal back to kJ (kcal * 4.184) to stay consistent with your foods.json schema
    const energykJ = Math.round(kcal * 4.184);
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString().slice(-4);
    const tags = tagsInput ? tagsInput.split(",").map(t => t.trim().toLowerCase()).filter(Boolean) : [];

    const newFoodObject = {
      id,
      name,
      [selectedNewFoodUnit]: {
        energy: energykJ,
        protein,
        fat,
        carbohydrate: carbs
      },
      tags
    };

    try {
      const response = await fetch("/api/foods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newFoodObject)
      });

      if (!response.ok) throw new Error("Server error saving food");

      // Refresh local database so it's immediately searchable
      await loadFoodDatabase();
      form.reset();

      feedback.textContent = `✓ "${name}" saved to foods.json!`;
      feedback.classList.remove("hidden", "error");
      setTimeout(() => feedback.classList.add("hidden"), 3500);
    } catch (err) {
      console.error(err);
      feedback.textContent = "Error saving food. Make sure server.js is restarted.";
      feedback.classList.remove("hidden");
      feedback.classList.add("error");
    }
  });
}

function setupSearchAutocomplete() {
  const input = document.getElementById("food-search");
  const dropdown = document.getElementById("search-dropdown");

  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    dropdown.innerHTML = "";
    selectedFoodItem = null;

    if (!query) {
      dropdown.classList.add("hidden");
      return;
    }

    const matches = foodDatabase.filter(f => f.name.toLowerCase().includes(query));

    if (matches.length === 0) {
      dropdown.classList.add("hidden");
      return;
    }

    matches.forEach(food => {
      const div = document.createElement("div");
      div.className = "search-dropdown-item";
      div.textContent = food.name;
      div.addEventListener("click", () => {
        input.value = food.name;
        selectedFoodItem = food;
        dropdown.classList.add("hidden");
      });
      dropdown.appendChild(div);
    });

    dropdown.classList.remove("hidden");
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-container")) {
      dropdown.classList.add("hidden");
    }
  });
}

function getLogs() {
  return JSON.parse(localStorage.getItem("mealLogs") || "{}");
}

function renderDailyLog() {
  const logs = getLogs();
  const entries = logs[selectedDate] || [];
  const container = document.getElementById("meal-sections-container");
  container.innerHTML = "";

  let totalCals = 0, totalPro = 0, totalCarbs = 0, totalFat = 0;

  entries.forEach(item => {
    totalCals += item.calories;
    totalPro += item.protein;
    totalCarbs += item.carbs;
    totalFat += item.fat;
  });

  MEAL_SECTIONS.forEach(mealName => {
    const mealEntries = entries.filter(e => (e.meal || "Breakfast") === mealName);
    const mealCals = mealEntries.reduce((sum, e) => sum + e.calories, 0);

    const sectionCard = document.createElement("div");
    sectionCard.className = "meal-section-card";

    let itemsHtml = "";
    if (mealEntries.length === 0) {
      itemsHtml = `<div class="empty-meal-msg">No items logged</div>`;
    } else {
      itemsHtml = mealEntries.map(item => `
        <div class="logged-item">
          <div class="item-top">
            <div>
              <div class="item-name">${item.name}</div>
              <div class="item-meta">${item.grams}g / ml</div>
            </div>
            <button type="button" class="remove-item-btn" data-id="${item.entryId}">✕</button>
          </div>
          <div class="item-macros">
            <span class="accent">Cals: <strong>${Math.round(item.calories)}</strong></span>
            <span>Protein: <strong>${item.protein.toFixed(1)}g</strong></span>
            <span>Carbs: <strong>${item.carbs.toFixed(1)}g</strong></span>
            <span>Fat: <strong>${item.fat.toFixed(1)}g</strong></span>
          </div>
        </div>
      `).join("");
    }

    sectionCard.innerHTML = `
      <div class="meal-section-header">
        <span class="meal-section-title">${mealName}</span>
        <span class="meal-section-kcal">${Math.round(mealCals)} kcal</span>
      </div>
      <div class="meal-items-body">
        ${itemsHtml}
      </div>
    `;

    container.appendChild(sectionCard);
  });

  document.querySelectorAll(".remove-item-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.id);
      logs[selectedDate] = entries.filter(e => e.entryId !== id);
      if (logs[selectedDate].length === 0) delete logs[selectedDate];
      localStorage.setItem("mealLogs", JSON.stringify(logs));
      renderDailyLog();
    });
  });

  document.getElementById("total-cals").textContent = Math.round(totalCals);
  document.getElementById("total-protein").textContent = totalPro.toFixed(1);
  document.getElementById("total-carbs").textContent = totalCarbs.toFixed(1);
  document.getElementById("total-fat").textContent = totalFat.toFixed(1);
}

function formatDateKey(dateObj) {
  return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
}

function parseDateKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function changeDate(offset) {
  const d = parseDateKey(selectedDate);
  d.setDate(d.getDate() + offset);
  selectedDate = formatDateKey(d);
  updateDateHeader();
  renderDailyLog();
}

function updateDateHeader() {
  const todayKey = formatDateKey(new Date());
  const label = document.getElementById("current-date-label");
  label.textContent = selectedDate === todayKey
    ? "Today"
    : parseDateKey(selectedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function switchTab(targetId) {
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  document.getElementById(targetId).classList.remove("hidden");
  document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.target === targetId));

  if (targetId === "view-calendar") renderCalendar();
  if (targetId === "view-stats") renderStats();
}

function renderCalendar() {
  const grid = document.getElementById("calendar-grid");
  grid.innerHTML = "";
  const year = calendarViewDate.getFullYear();
  const month = calendarViewDate.getMonth();
  document.getElementById("cal-month-label").textContent =
    calendarViewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const logs = getLogs();

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    empty.className = "cal-day empty";
    grid.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayEntries = logs[key] || [];
    const cals = dayEntries.reduce((sum, e) => sum + e.calories, 0);

    const cell = document.createElement("div");
    cell.className = "cal-day";
    if (key === selectedDate) cell.classList.add("selected");
    if (cals > 0) cell.classList.add("has-data");

    cell.innerHTML = `<span class="cal-day-num">${day}</span><span class="cal-day-kcal">${cals > 0 ? Math.round(cals) : ""}</span>`;
    cell.addEventListener("click", () => {
      selectedDate = key;
      updateDateHeader();
      renderDailyLog();
      switchTab("view-log");
    });
    grid.appendChild(cell);
  }
}

function renderStats() {
  const logs = getLogs();
  const activeDate = parseDateKey(selectedDate);
  const startOfWeek = new Date(activeDate);
  startOfWeek.setDate(activeDate.getDate() - activeDate.getDay());

  let weekCals = 0, weekPro = 0, weekDays = 0;
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dailyVals = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const entries = logs[formatDateKey(d)] || [];
    const cals = entries.reduce((s, e) => s + e.calories, 0);
    const pro = entries.reduce((s, e) => s + e.protein, 0);
    dailyVals.push({ label: dayNames[i], cals });

    if (cals > 0) {
      weekCals += cals;
      weekPro += pro;
      weekDays++;
    }
  }

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  document.getElementById("week-range-label").textContent =
    `${startOfWeek.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${endOfWeek.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  document.getElementById("week-total-cals").textContent = Math.round(weekCals).toLocaleString();
  document.getElementById("week-avg-cals").textContent = weekDays ? Math.round(weekCals / weekDays).toLocaleString() : 0;
  document.getElementById("week-total-pro").textContent = Math.round(weekPro);
  document.getElementById("week-avg-pro").textContent = weekDays ? (weekPro / weekDays).toFixed(1) : 0;

  const barsContainer = document.getElementById("week-bars");
  barsContainer.innerHTML = "";
  const maxCals = Math.max(...dailyVals.map(v => v.cals), 2000);

  dailyVals.forEach(item => {
    const pct = Math.round((item.cals / maxCals) * 100);
    const col = document.createElement("div");
    col.className = "bar-col";
    col.innerHTML = `<div class="bar-fill" style="height: ${item.cals > 0 ? Math.max(pct, 8) : 4}%; opacity: ${item.cals > 0 ? 1 : 0.25};"></div><span class="bar-lbl">${item.label}</span>`;
    barsContainer.appendChild(col);
  });

  const year = activeDate.getFullYear();
  const month = activeDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let mCals = 0, mPro = 0, mCarbs = 0, mDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const entries = logs[`${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`] || [];
    if (entries.length > 0) {
      mCals += entries.reduce((s, e) => s + e.calories, 0);
      mPro += entries.reduce((s, e) => s + e.protein, 0);
      mCarbs += entries.reduce((s, e) => s + e.carbs, 0);
      mDays++;
    }
  }

  document.getElementById("month-report-title").textContent = activeDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  document.getElementById("month-days-logged").textContent = `${mDays} days logged`;
  document.getElementById("month-total-cals").textContent = Math.round(mCals).toLocaleString();
  document.getElementById("month-avg-cals").textContent = mDays ? Math.round(mCals / mDays).toLocaleString() : 0;
  document.getElementById("month-total-pro").textContent = Math.round(mPro);
  document.getElementById("month-total-carbs").textContent = Math.round(mCarbs);
}