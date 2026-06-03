import sqlite3, time, json
from datetime import datetime, timezone


def default_starting_map():
    """Returns the JSON string for a new colony's pre-dug starting layout.

    A narrow entrance shaft (col 50) leads down into a small oval chamber.
    All tiles are already complete (completion = null).
    """
    CENTER = 50
    tiles = {
        0: [CENTER],
        1: [CENTER],
        2: [CENTER - 1, CENTER, CENTER + 1],
        3: [CENTER - 2, CENTER - 1, CENTER, CENTER + 1, CENTER + 2],
        4: [CENTER - 2, CENTER - 1, CENTER, CENTER + 1, CENTER + 2],
        5: [CENTER - 1, CENTER, CENTER + 1],
    }
    map_data = {}
    for row, cols in tiles.items():
        map_data[row] = {col: {"type": "tunnel", "completion": None} for col in cols}
    return json.dumps(map_data)

class Database:
    
    def __init__(self):
        self.db_path = "database.db"
        self.create_tables()
    
    def get_connection(self):
        return sqlite3.connect(self.db_path)
    
    def _fetch(self, query, params=(), one=False):
        """Helper for SELECT queries, returns list of dicts or single dict if one=True"""
        conn = self.get_connection()
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        try:
            cur.execute(query, params)
            if one:
                row = cur.fetchone()
                return dict(row) if row else None
            return [dict(row) for row in cur.fetchall()]
        finally:
            conn.close()

    def _execute(self, query, params=()):
        """Helper for INSERT/UPDATE/DELETE queries"""
        conn = self.get_connection()
        cur = conn.cursor()
        try:
            cur.execute(query, params)
            conn.commit()
        finally:
            conn.close()

    def get_readings(self, username, begin_time, end_time=datetime.now(timezone.utc).isoformat()):

        return self._fetch(
            "SELECT * FROM sensor_reading WHERE username=? AND (timestamp BETWEEN ? AND ?)",
            (username, begin_time, end_time)
        )

    def user_exists(self, username):
        rows = self._fetch(
            "SELECT COUNT(*) as count FROM user WHERE username = ?",
            (username,)
        )
        return rows[0]['count'] > 0

    def insert_user(self, username):
        self._execute(
            "INSERT OR IGNORE INTO user (username) VALUES (?)",
            (username,)
        )
        self._execute(
            "INSERT OR IGNORE INTO colony (username,air_quality,food_amount,map) VALUES (?,?,?,?)",
            (username, 0, 0, default_starting_map())
        )
        # Unlock the cheapest ant type (Worker) by default
        cheapest = self._fetch(
            "SELECT id FROM ant_type ORDER BY unlock_cost ASC LIMIT 1"
        )
        if cheapest:
            self._execute(
                "INSERT OR IGNORE INTO user_unlocked_ant_type (username, ant_type_id) VALUES (?,?)",
                (username, cheapest[0]['id'])
            )

    def get_unlocked_ant_type_ids(self, username):
        rows = self._fetch(
            "SELECT ant_type_id FROM user_unlocked_ant_type WHERE username = ?",
            (username,)
        )
        return [r['ant_type_id'] for r in rows]

    def unlock_ant_type(self, username, ant_type_id):
        """Deducts food and records the unlock. Returns (success, message)."""
        ant_type = self._fetch(
            "SELECT unlock_cost FROM ant_type WHERE id = ?",
            (ant_type_id,),
            one=True
        )
        if not ant_type:
            return False, "Ant type not found"

        already = self._fetch(
            "SELECT 1 FROM user_unlocked_ant_type WHERE username=? AND ant_type_id=?",
            (username, ant_type_id)
        )
        if already:
            return False, "Already unlocked"

        cost = ant_type['unlock_cost']
        colony = self._fetch(
            "SELECT food_amount FROM colony WHERE username=?",
            (username,),
            one=True
        )
        if not colony or colony['food_amount'] < cost:
            return False, "Not enough food"

        self._execute(
            "UPDATE colony SET food_amount = food_amount - ? WHERE username = ?",
            (cost, username)
        )
        self._execute(
            "INSERT INTO user_unlocked_ant_type (username, ant_type_id) VALUES (?,?)",
            (username, ant_type_id)
        )
        return True, "Unlocked"

    def delete_reading(self, reading_id):
        self._execute("DELETE FROM sensor_reading WHERE id = ?", (reading_id,))

    def update_reading(self, reading_id, pm, timestamp, longitude, latitude):
        self._execute(
            "UPDATE sensor_reading SET pm=?, timestamp=?, longitude=?, latitude=? WHERE id=?",
            (pm, timestamp, longitude, latitude, reading_id)
        )

    def insert_user_reading(self, username, pm, timestamp, longitude, latitude):
        self._execute(
            "INSERT OR IGNORE INTO sensor_reading (username, pm, timestamp, longitude, latitude) VALUES (?, ?, ?, ?, ?)",
            (username, pm, timestamp, longitude, latitude)
        )

    def get_egg_inventory(self, colony_id):
        """Returns {ant_type_id: count} for all egg types in the colony."""
        rows = self._fetch(
            "SELECT ant_type_id, count FROM egg_inventory WHERE colony_id = ?",
            (colony_id,)
        )
        return {r['ant_type_id']: r['count'] for r in rows}

    def save_egg_inventory(self, colony_id, eggs):
        """Persists egg inventory. eggs = {ant_type_id: count}."""
        self._execute("DELETE FROM egg_inventory WHERE colony_id = ?", (colony_id,))
        for ant_type_id, count in eggs.items():
            if count > 0:
                self._execute(
                    "INSERT INTO egg_inventory (colony_id, ant_type_id, count) VALUES (?,?,?)",
                    (colony_id, int(ant_type_id), count)
                )

    def save_game_state(self, username, map, food_amount, aq, populations, egg_inventory=None, last_update=None):
        self._execute(
            "INSERT OR REPLACE INTO colony (username, map, food_amount, air_quality, last_update) VALUES (?, ?, ?, ?, ?)",
            (username, map, food_amount, aq, last_update)
        )
        colony = self._fetch("SELECT id FROM colony WHERE username = ?", (username,))
        colony_id = colony[0]['id']

        # clear old population records before reinserting
        self._execute("DELETE FROM colony_population WHERE colony_id = ?", (colony_id,))

        for record in populations:
            ant_type_name = record['antType']['name']
            population_count = record['population']
            ant_type = self._fetch("SELECT id FROM ant_type WHERE name = ?", (ant_type_name,))
            ant_type_id = ant_type[0]['id']
            self._execute(
                "INSERT INTO colony_population (colony_id, ant_type_id, population) VALUES (?, ?, ?)",
                (colony_id, ant_type_id, population_count)
            )

        if egg_inventory is not None:
            self.save_egg_inventory(colony_id, egg_inventory)

    def retrieve_game_state(self, username):
        colony = self._fetch(
            "SELECT * FROM colony WHERE username = ?",
            (username,),
            one=True
        )


        if not colony:
            return None

        populations = self._fetch(
            "SELECT * FROM colony_population WHERE colony_id = ?",
            (colony['id'],)
        )

        ant_types = self._fetch(
            "SELECT * FROM ant_type",
        )
        
        unlocked_ids = self.get_unlocked_ant_type_ids(username)
        egg_inventory = self.get_egg_inventory(colony['id'])

        result = {}
        result['colony'] = colony
        result['populations'] = populations
        result['ant_types'] = ant_types
        result['unlocked_ant_type_ids'] = unlocked_ids
        result['egg_inventory'] = egg_inventory

        return result

    def close(self):
        pass

    def create_tables(self, clear=False):
        conn = self.get_connection()
        cur = conn.cursor()
        try:
            if clear:
                tables = ["user", "sensor_reading", "colony", "ant_type", "colony_population", "user_unlocked_ant_type", "egg_inventory"]
                for table in tables:
                    cur.execute(f"DROP TABLE IF EXISTS {table}")

            cur.execute("PRAGMA foreign_keys = ON;")
            cur.execute("""
            CREATE TABLE IF NOT EXISTS user (
                username TEXT PRIMARY KEY
            )""")

            cur.execute("""
            CREATE TABLE IF NOT EXISTS sensor_reading (
                id INTEGER PRIMARY KEY,
                username INTEGER NOT NULL,
                pm REAL NOT NULL,
                timestamp TEXT NOT NULL,
                longitude REAL NOT NULL,
                latitude REAL NOT NULL,
                FOREIGN KEY(username) REFERENCES user(username) ON DELETE CASCADE,
                UNIQUE(username, timestamp)
            )""")

            cur.execute("""
                CREATE TABLE IF NOT EXISTS colony (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL UNIQUE,
                    air_quality INTEGER NOT NULL DEFAULT 0,
                    food_amount INTEGER NOT NULL DEFAULT 0,
                    map TEXT NOT NULL DEFAULT '{}',
                    last_update INTEGER NOT NULL DEFAULT 0,
                    FOREIGN KEY(username) REFERENCES user(username) ON DELETE CASCADE
                )
            """)

            cur.execute("""
            CREATE TABLE IF NOT EXISTS ant_type (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                foraging REAL NOT NULL,
                mining REAL NOT NULL,
                hunger_cost REAL NOT NULL,
                attack REAL NOT NULL,
                unlock_cost INTEGER NOT NULL DEFAULT 0
            )""")

            # Migrate: add unlock_cost if it doesn't exist yet
            try:
                cur.execute("ALTER TABLE ant_type ADD COLUMN unlock_cost INTEGER NOT NULL DEFAULT 0")
                conn.commit()
            except Exception:
                pass

            cur.execute("""
            CREATE TABLE IF NOT EXISTS user_unlocked_ant_type (
                username TEXT NOT NULL,
                ant_type_id INTEGER NOT NULL,
                PRIMARY KEY (username, ant_type_id),
                FOREIGN KEY(username) REFERENCES user(username) ON DELETE CASCADE,
                FOREIGN KEY(ant_type_id) REFERENCES ant_type(id)
            )""")

            cur.execute("""
            CREATE TABLE IF NOT EXISTS colony_population (
                colony_id INTEGER NOT NULL,
                ant_type_id INTEGER NOT NULL,
                population INTEGER NOT NULL,
                PRIMARY KEY(colony_id, ant_type_id),
                FOREIGN KEY(colony_id) REFERENCES colony(id) ON DELETE CASCADE,
                FOREIGN KEY(ant_type_id) REFERENCES ant_type(id)
            )""")

            cur.execute("""
            CREATE TABLE IF NOT EXISTS egg_inventory (
                colony_id INTEGER NOT NULL,
                ant_type_id INTEGER NOT NULL,
                count REAL NOT NULL DEFAULT 0,
                PRIMARY KEY (colony_id, ant_type_id),
                FOREIGN KEY(colony_id) REFERENCES colony(id) ON DELETE CASCADE,
                FOREIGN KEY(ant_type_id) REFERENCES ant_type(id)
            )""")

            conn.commit()
        finally:
            conn.close()