import time
from flask import Flask, jsonify, request
from flask_cors import CORS

# This code should be running within a Docker container on AWS EC2 instance
app = Flask(__name__)
CORS(app)

# Right now, the server only holds a single record of PM10 data. In the future, I
# want to integrate a database to hold historical data
current_data = {"PM10": -1, "timestamp": time.time()}

# Route to get the current PM10 data in runtime on the server
@app.route('/', methods=['GET'])
def PM10():
    return jsonify(current_data)

# Route used to set the current PM10 data
@app.route('/storePM10', methods=['POST'])
def PM10Store():
    data = request.get_json()
    PM10 = data.get('PM10')
    timestamp = data.get('timestamp')

    current_data["PM10"] = PM10
    current_data["timestamp"] = timestamp

    return jsonify({"message": str(PM10) + " " + str(timestamp)})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)