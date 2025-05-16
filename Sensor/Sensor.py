from recorder import Recorder
import time
import requests
import json

baseURL = "http://44.247.151.69:5000/"
def test():
    recorder = Recorder()

    headers = {'Content-type': 'application/json'}

    while True:

        concPM10_0_ATM = recorder.PM10()
        
        # Ignore invalid sensor outputs
        if concPM10_0_ATM == -1:
            continue
        
        print("PM1 Atmospheric concentration = " + str(concPM10_0_ATM) + " ug/m3")

        # Send a request to the server
        data = {'PM10': concPM10_0_ATM, 'timestamp':time.time()}

        response = requests.post(baseURL+"storePM10", json=data, headers=headers)
        if response.status_code == 200:
            new_item = response.json()
            print(new_item)
        else:
            print(f"Error: {response.status_code}")

        time.sleep(0.7)
        
print("testing")
test()