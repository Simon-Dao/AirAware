from database import Database
import time

# Test the import
db = Database()
db.createTables()
db.insertSensor(1)
db.insertSensorReading(1,45,time.time())
db.insertSensorReading(2,45,time.time()) #its inserting this even though 2 is not in the sensor_id table. 
db.insertSensorReading(3,45,1)