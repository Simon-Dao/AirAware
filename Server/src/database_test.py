from database import Database
import time

# Test the import
db = Database()
db.createTables()
db.insertSensor(10)
db.insertSensorReading(11,45,time.time())
db.insertSensorReading(10,45,time.time())
"""
db.insertSensorReading(5,45,time.time()) #its inserting this even though 2 is not in the sensor_id table. 
db.insertSensorReading(4,45,1) #its also inserting invalid timestamps
"""