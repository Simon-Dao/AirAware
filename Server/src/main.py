import time
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

current_data = {"PM10": -1, "timestamp": time.time()}

@app.route('/', methods=['GET'])
def PM10():
    return jsonify(current_data)

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