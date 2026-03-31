import sqlite3, time
from datetime import datetime, timezone

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
            (username,0,0,"{}")
        )

    def insert_user_reading(self, username, pm, timestamp, longitude, latitude):
        self._execute(
            "INSERT INTO sensor_reading (username, pm, timestamp, longitude, latitude) VALUES (?, ?, ?, ?, ?)",
            (username, pm, timestamp, longitude, latitude)
        )

    def save_game_state(self, username, map, food_amount, aq, populations, last_update=None):
        self._execute(
            "INSERT OR REPLACE INTO colony (username, map, food_amount, air_quality) VALUES (?, ?, ?, ?)",
            (username, map, food_amount, aq)
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
        
        result = {}
        result['colony'] = colony
        result['populations'] = populations
        result['ant_types'] = ant_types

        return result

    def close(self):
        pass

    def create_tables(self, clear=False):
        conn = self.get_connection()
        cur = conn.cursor()
        try:
            if clear:
                tables = ["user", "sensor_reading", "colony", "ant_type", "colony_population"]
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
                timestamp INTEGER NOT NULL,
                longitude REAL NOT NULL,
                latitude REAL NOT NULL,
                FOREIGN KEY(username) REFERENCES user(username) ON DELETE CASCADE
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
                attack REAL NOT NULL
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
            conn.commit()
        finally:
            conn.close()