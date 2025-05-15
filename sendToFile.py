from recorder import Recorder
import time

# Connects to the AWS VPS
url = "http://44.247.151.69:5000/"


def test():
    # Create an instance of the Recorder class
    recorder = Recorder()

    while True:
        recorder.PM10()
        time.sleep(0.7)
test()