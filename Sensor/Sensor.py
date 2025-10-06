from recorder import Recorder
import time
import requests
import json

SERVER_PORT = 5000

# This is a hard coded sensor ID, this will be dynamically assigned in the future
SENSOR_ID = 4848

# The public IP address of the EC2 instance
# This can be changed to localhost for local testing
# SERVER_URL = f"http://44.247.151.69:{SERVER_PORT}/"
SERVER_URL = f"http://192.168.0.16:{SERVER_PORT}/"

def initSensor():
    #register sensor into the database
    headers = {'Content-type': 'application/json'}
    data = {'sensor_id': SENSOR_ID}
    
    response = requests.post(SERVER_URL+"initSensor", json=data, headers=headers)
    
    if response.status_code == 200:
        new_item = response.json()
        print(new_item)
    else:
        print(f"Error: {response.status_code}")

def run():
    recorder = Recorder()
    initSensor()

    headers = {'Content-type': 'application/json'}
    
    while True:

        concPM10_0_ATM = recorder.PM10()
        time.sleep(0.7)
        
        # Ignore invalid sensor outputs
        if concPM10_0_ATM == -1:
            continue
        
        print("PM1 Atmospheric concentration = " + str(concPM10_0_ATM) + " ug/m3")

        # Send a request to the server
        data = {'sensor_id': SENSOR_ID, 'PM10': concPM10_0_ATM, 'timestamp':time.time()}

        response = requests.post(SERVER_URL+"storePM10", json=data, headers=headers)
        if response.status_code == 200:
            new_item = response.json()
            print(new_item)
        else:
            print(f"Error: {response.status_code}")

        
run()
