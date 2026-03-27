from database import *

db = Database()

db.create_tables(clear=True)

#create user
db.insert_user("simond")

db.insert_user_reading("simond", 67.67, "2026-03-27T11:42:20Z", 47.54582426597429, -122.28168546800501)
#create colony
print(db.get_readings("simond","2026-02-27T11:42:20Z"))