"""
Seed script: populates the database with test data.
Run from the Server/ directory: python seed.py

Creates:
  - A test user ("testuser")
  - 14 days of sensor readings (multiple per day, realistic PM values)
  - Ant types for the game
  - A saved colony/game state
"""

from database import Database
from datetime import datetime, timezone, timedelta
import random
import json

random.seed(42)

db = Database()
db.create_tables(clear=False)

USERNAME = "testuser"

# ── User ────────────────────────────────────────────────────────────────────
if not db.user_exists(USERNAME):
    db.insert_user(USERNAME)
    print(f"Created user: {USERNAME}")
else:
    print(f"User already exists: {USERNAME}")

# ── Cleanup existing readings ────────────────────────────────────────────────
db._execute("DELETE FROM sensor_reading WHERE username = ?", (USERNAME,))
print(f"Cleared existing readings for {USERNAME}")

# ── Sensor readings ──────────────────────────────────────────────────────────
# Seattle-area coordinates with slight variation
BASE_LAT = 47.6062
BASE_LON = -122.3321

# Simulate readings every ~2 hours for the last 14 days
# PM values follow a daily curve (higher in morning/evening rush, lower midday)
def pm_for_hour(hour: int) -> float:
    """Return a realistic PM2.5 value for a given hour (0-23)."""
    base = 15 + 20 * (
        0.6 * abs(hour - 8) / 8 +   # morning peak around 8am
        0.4 * abs(hour - 18) / 6     # evening peak around 6pm
    )
    return round(max(5, base + random.uniform(-5, 10)), 2)

now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
readings_added = 0

for day_offset in range(14, -1, -1):
    day = now - timedelta(days=day_offset)
    hours = sorted(random.sample(range(24), 7))
    # Start each day from a slightly different base position
    day_lat = BASE_LAT + random.uniform(-0.03, 0.03)
    day_lon = BASE_LON + random.uniform(-0.03, 0.03)
    cur_lat, cur_lon = day_lat, day_lon
    for hour in hours:
        ts = day.replace(hour=hour)
        # Random walk: each step moves up to ~500m from the previous point
        cur_lat += random.uniform(-0.004, 0.004)
        cur_lon += random.uniform(-0.005, 0.005)
        pm = pm_for_hour(hour)
        db.insert_user_reading(USERNAME, pm, ts.isoformat(), round(cur_lon, 6), round(cur_lat, 6))
        readings_added += 1

print(f"Inserted {readings_added} sensor readings over 15 days (March 17–31)")

# ── Ant types ────────────────────────────────────────────────────────────────
ant_types = [
    ("Worker",   0.8, 0.3, 0.5, 0.2),
    ("Soldier",  0.2, 0.1, 0.7, 0.9),
    ("Scout",    0.6, 0.1, 0.4, 0.3),
    ("Miner",    0.3, 0.9, 0.6, 0.1),
]

for name, foraging, mining, hunger_cost, attack in ant_types:
    existing = db._fetch("SELECT id FROM ant_type WHERE name = ?", (name,))
    if not existing:
        db._execute(
            "INSERT INTO ant_type (name, foraging, mining, hunger_cost, attack) VALUES (?,?,?,?,?)",
            (name, foraging, mining, hunger_cost, attack)
        )

print(f"Inserted {len(ant_types)} ant types")

# ── Game state ───────────────────────────────────────────────────────────────
ant_type_rows = db._fetch("SELECT * FROM ant_type")
populations = [
    {"antType": {"name": r["name"]}, "population": random.randint(10, 100)}
    for r in ant_type_rows
]

db.save_game_state(
    username=USERNAME,
    map=json.dumps({"tiles": []}),
    food_amount=250,
    aq=72,
    populations=populations,
    last_update=int(now.timestamp()),
)
print(f"Saved game state for {USERNAME}")

# ── Summary ──────────────────────────────────────────────────────────────────
print("\n--- Verification ---")
recent = db.get_readings(USERNAME, (now - timedelta(days=15)).isoformat(), now.isoformat())
print(f"Total readings for {USERNAME}: {len(recent)}")
state = db.retrieve_game_state(USERNAME)
print(f"Colony: food={state['colony']['food_amount']}, aq={state['colony']['air_quality']}")