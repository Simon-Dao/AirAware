import sqlite3, time

class Database:
    
    def __init__(self):
        self.db_path = "database.db"
        self.createTables()
    
    def get_connection(self):
        """Get a new database connection for each operation"""
        return sqlite3.connect(self.db_path)
    
    def userExists(self, username):
        conn = self.get_connection()
        cur = conn.cursor()
        try:
            cur.execute("SELECT COUNT(*) FROM user WHERE user.username = "+username, (username,))
            rows = cur.fetchall()
        finally:
            conn.close()

    def insertUser(self, username):
        conn = self.get_connection()
        cur = conn.cursor()
        try:
            cur.execute("INSERT OR IGNORE INTO user (username) VALUES (?)", (username,))
            conn.commit()
        finally:
            conn.close()

    def insertSensorReading(self, username, pm, timestamp):
        conn = self.get_connection()
        cur = conn.cursor()
        try:
            cur.execute("INSERT INTO sensor_reading (username, pm, timestamp) VALUES (?, ?, ?)", (username, pm, timestamp))
            conn.commit()
        finally:
            conn.close()

    #saves the map, food_amount, aq, and populations
    def saveGameState(self, username, map, food_amount, aq, populations):
        conn = self.get_connection()
        cur = conn.cursor()
        try:
            cur.execute("INSERT INTO sensor_reading (sensor_fk, pm, timestamp) VALUES (?, ?, ?)", (username, pm, timestamp))
            conn.commit()
        finally:
            conn.close()

    #retrieves the map, food_amount, aq, and populations
    def retrieveGameState(self, username):
        conn = self.get_connection()
        cur = conn.cursor()
        try:
            cur.execute("INSERT INTO sensor_reading (username, pm, timestamp) VALUES (?, ?, ?)", (username, pm, timestamp))
            conn.commit()
        finally:
            conn.close()

    def close(self):
        # This method is now less critical but kept for compatibility
        pass
    
    def createTables(self, clear=False):

        conn = self.get_connection()
        cur = conn.cursor()

        try:
            #clear all tables
            if clear:
                tables = ["user", "sensor_reading", "colony", "ant_type", "colony_population"]

                for table in tables:
                    cur.execute(f"DROP TABLE IF EXISTS {table}")

            # Create tables
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
                longitude REAL,
                latitude REAL,
                FOREIGN KEY(username) REFERENCES user(username) ON DELETE CASCADE
            )""")

            cur.execute("""
            CREATE TABLE IF NOT EXISTS colony (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username INTEGER NOT NULL UNIQUE,
                aq_level INTEGER NOT NULL DEFAULT 0,
                food_amount INTEGER NOT NULL DEFAULT 0,
                map TEXT NOT NULL,
                FOREIGN KEY(username) REFERENCES user(username) ON DELETE CASCADE
            )""")

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