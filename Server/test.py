from database import *

db = Database()

db.createTables(clear=True)

#create user
db.insertUser("simond")
#create colony