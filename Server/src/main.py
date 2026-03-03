import time
from flask import Flask, jsonify, request
from flask_cors import CORS
from database import Database

# This code should be running within a Docker container on AWS EC2 instance
app = Flask(__name__)
CORS(app)
database = Database()

@app.route('/test', methods=['GET'])
def test():
    return jsonify({"message": "Server is running"})

# Route to get the current PM10 data in runtime on the server
@app.route('/', methods=['GET'])
def PM10():
    return jsonify({"pm10": "this is a test"})


@app.route('/initSensor', methods=['POST'])
def initSensor():
    data = request.get_json()
    sensor_id = data.get('sensor_id')
    database.insertSensor(sensor_id)
    return jsonify({"message": "Sensor initialized", "sensor_id": sensor_id})
    
# Route used to add a new PM10 record
@app.route('/storePM10', methods=['POST'])
def PM10Store():
    data = request.get_json()
    PM10 = data.get('PM10')
    sensor_id = data.get('sensor_id')
    timestamp = data.get('timestamp')

    database.insertSensorReading(sensor_id, PM10, timestamp)
    
    return jsonify({"message": str(PM10) + " " + str(timestamp)})

# Route used to add a new PM10 record
@app.route('/save', methods=['POST'])
def saveGame():
    data = request.get_json()
    PM10 = data.get('PM10')
    sensor_id = data.get('sensor_id')
    timestamp = data.get('timestamp')

    database.insertSensorReading(sensor_id, PM10, timestamp)
    
    return jsonify({"message": str(PM10) + " " + str(timestamp)})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)