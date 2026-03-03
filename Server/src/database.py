import sqlite3, time

class Database:
    
    def __init__(self):
        self.db_path = "database.db"
        self.createTables()
    
    def get_connection(self):
        """Get a new database connection for each operation"""
        return sqlite3.connect(self.db_path)
    
    def insertSensor(self, sensor_id):
        conn = self.get_connection()
        cur = conn.cursor()
        try:
            cur.execute("INSERT OR IGNORE INTO sensor (id) VALUES (?)", (sensor_id,))
            conn.commit()
        finally:
            conn.close()

    def insertSensorReading(self, sensor_id, pm10, timestamp):
        conn = self.get_connection()
        cur = conn.cursor()
        try:
            cur.execute("INSERT INTO sensor_reading (sensor_fk, pm10, timestamp) VALUES (?, ?, ?)", (sensor_id, pm10, timestamp))
            conn.commit()
        finally:
            conn.close()

    #saves the map, food_amount, aq, and populations
    def saveGameState(self, map, food_amount, aq, populations):
        conn = self.get_connection()
        cur = conn.cursor()
        try:
            cur.execute("INSERT INTO sensor_reading (sensor_fk, pm10, timestamp) VALUES (?, ?, ?)", (sensor_id, pm10, timestamp))
            conn.commit()
        finally:
            conn.close()

    #retrieves the map, food_amount, aq, and populations
    def retrieveGameState():
        conn = self.get_connection()
        cur = conn.cursor()
        try:
            cur.execute("INSERT INTO sensor_reading (sensor_fk, pm10, timestamp) VALUES (?, ?, ?)", (sensor_id, pm10, timestamp))
            conn.commit()
        finally:
            conn.close()

    def close(self):
        # This method is now less critical but kept for compatibility
        pass
    
    def createTables(self):
        conn = self.get_connection()
        cur = conn.cursor()
        try:
            # Create tables
            cur.execute("PRAGMA foreign_keys = ON;")
            cur.execute("""
            CREATE TABLE IF NOT EXISTS user (
                id INTEGER PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL
            )""")

            cur.execute("""
            CREATE TABLE IF NOT EXISTS sensor (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                FOREIGN KEY(user_id) REFERENCES user(id) ON DELETE CASCADE
            )""")

            cur.execute("""
            CREATE TABLE IF NOT EXISTS sensor_reading (
                id INTEGER PRIMARY KEY,
                sensor_id INTEGER NOT NULL,
                pm10 REAL NOT NULL,
                timestamp INTEGER NOT NULL,
                longitude REAL,
                latitude REAL,
                FOREIGN KEY(sensor_id) REFERENCES sensor(id) ON DELETE CASCADE
            )""")

            cur.execute("""
            CREATE TABLE IF NOT EXISTS colony (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL UNIQUE,
                aq_level INTEGER NOT NULL DEFAULT 0,
                food_amount INTEGER NOT NULL DEFAULT 0,
                map TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES user(id) ON DELETE CASCADE
            )""")

            cur.execute("""
            CREATE TABLE IF NOT EXISTS ant_type (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                foraging REAL NOT NULL,
                mining REAL NOT NULL,
                hunger_cost REAL NOT NULL,
                attack REAL NOT NULL,
                egg_cost REAL NOT NULL,
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