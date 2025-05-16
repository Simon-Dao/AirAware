import time

from flask import Flask, jsonify, request
import random

app = Flask(__name__)

@app.route('/', methods=['GET'])
def PM10():
    return jsonify({"PM10": random.randint(0,10), "timestamp":time.time()})

@app.route('/storePM10', methods=['POST'])
def PM10Store():

    PM10 = request.headers.get('PM10')
    timestamp = request.headers.get('timestamp')

    print(PM10, timestamp)

    return jsonify({"message": str(PM10) + " " + str(timestamp)})
    # return jsonify({"status": 400, "message": "Error occured with request"})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)