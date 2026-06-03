"""
Seed script: populates the database with test data.
Run from the Server/ directory: python seed.py

Creates:
  - A test user ("testuser")
  - 14 days of sensor readings (multiple per day, realistic PM values)
  - Ant types for the game
  - A saved colony/game state
"""

from database import Database, default_starting_map
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

for day_offset in range(59, -1, -1):
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
# Rates are per-ant per-second.
# With ~50 Workers: net foraging ~+0.05/s → Scout (500 food) in ~2.5 hrs from starting 250 food.
# (name, foraging, mining, hunger_cost, attack, unlock_cost)
ant_types = [
    ("Worker",   0.003, 0.001, 0.002,  0.001,    0),
    ("Scout",    0.005, 0.0003, 0.0015, 0.001,  500),
    ("Miner",    0.001, 0.003,  0.002,  0.0003, 1000),
    ("Soldier",  0.0009, 0.0001, 0.003, 0.003, 2000),
]

for name, foraging, mining, hunger_cost, attack, unlock_cost in ant_types:
    existing = db._fetch("SELECT id FROM ant_type WHERE name = ?", (name,))
    if not existing:
        db._execute(
            "INSERT INTO ant_type (name, foraging, mining, hunger_cost, attack, unlock_cost) VALUES (?,?,?,?,?,?)",
            (name, foraging, mining, hunger_cost, attack, unlock_cost)
        )
    else:
        db._execute(
            "UPDATE ant_type SET foraging=?, mining=?, hunger_cost=?, attack=?, unlock_cost=? WHERE name=?",
            (foraging, mining, hunger_cost, attack, unlock_cost, name)
        )

print(f"Inserted/updated {len(ant_types)} ant types")

# ── Ensure testuser has Worker unlocked ──────────────────────────────────────
worker = db._fetch("SELECT id FROM ant_type WHERE name='Worker'", one=True)
if worker:
    db._execute(
        "INSERT OR IGNORE INTO user_unlocked_ant_type (username, ant_type_id) VALUES (?,?)",
        (USERNAME, worker['id'])
    )
    print(f"Ensured Worker is unlocked for {USERNAME}")

# ── Game state ───────────────────────────────────────────────────────────────
ant_type_rows = db._fetch("SELECT * FROM ant_type")
populations = [
    {"antType": {"name": r["name"]}, "population": random.randint(10, 100)}
    for r in ant_type_rows
]

worker_id = worker['id'] if worker else None
starter_eggs = {worker_id: 20} if worker_id else {}

db.save_game_state(
    username=USERNAME,
    map=default_starting_map(),
    food_amount=250,
    aq=72,
    populations=populations,
    egg_inventory=starter_eggs,
    last_update=int(now.timestamp()),
)
print(f"Saved game state for {USERNAME} (20 Worker starter eggs)")

# ── Summary ──────────────────────────────────────────────────────────────────
print("\n--- Verification ---")
recent = db.get_readings(USERNAME, (now - timedelta(days=15)).isoformat(), now.isoformat())
print(f"Total readings for {USERNAME}: {len(recent)}")
state = db.retrieve_game_state(USERNAME)
print(f"Colony: food={state['colony']['food_amount']}, aq={state['colony']['air_quality']}")