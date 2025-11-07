import sqlite3, time
import os

class Database:
    
    def __init__(self):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        self.db_path = os.path.join(base_dir, "database.db")
        self.createTables()
    
    def get_connection(self):
        try:
            """Get a new database connection for each operation"""
            conn = sqlite3.connect(self.db_path)
            conn.execute("PRAGMA foreign_keys = ON")
            print("Connection Successful!")
            return conn
        except Exception as e:
            print(f"GET_CONNECTION FAILURE: {e}")
    
    def insertSensor(self, sensor_id):
        conn = self.get_connection()
        cur = conn.cursor()
        try:
            cur.execute("INSERT OR IGNORE INTO sensor (id) VALUES (?)", (sensor_id,))
            conn.commit()
        except Exception as e:
        # 3. Catch *any* exception and print the detail
            print(f"STATUS: COMMIT FAILED. An exception occurred: {type(e).__name__} - {e}")
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

    def close(self):
        # This method is now less critical but kept for compatibility
        pass
    
    def createTables(self):
        conn = self.get_connection()
        cur = conn.cursor()
        try:
            # Create tables
            cur.execute("""
            CREATE TABLE IF NOT EXISTS sensor (
                id INTEGER PRIMARY KEY
            )""")

            cur.execute("""
            CREATE TABLE IF NOT EXISTS sensor_reading (
                pm10 REAL NOT NULL,
                timestamp REAL NOT NULL,
                sensor_fk INTEGER NOT NULL,
                PRIMARY KEY(sensor_fk, timestamp),
                FOREIGN KEY(sensor_fk) REFERENCES sensor(id)
            )""")

            conn.commit()
        finally:
            conn.close()