from recorder import Recorder
import time
import requests
import json

# URL for the server



def test():
    recorder = Recorder()
    
    headers = {'Content-type': 'application/json'}
    url = "http://44.247.151.69:5000/"  
      
    while True:
        
        
        concPM10_0_ATM = recorder.PM10()
        
        # Ignore invalid sensor outputs
        if concPM10_0_ATM == -1:
            continue
        
        print("PM1 Atmospheric concentration = " + str(concPM10_0_ATM) + " ug/m3")

        # Send a request to the server
        data = {'PM10': concPM10_0_ATM, 'timestamp':''}
        
        response = requests.post(url, data=json.dumps(
        
        time.sleep(0.7)
        
print("testing")
test()
