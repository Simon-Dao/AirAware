from flask import Flask, jsonify, request
from flask_cors import CORS
from flasgger import Swagger
from database import Database
from datetime import datetime, timezone

app = Flask(__name__)
CORS(app)
Swagger(app)
database = Database()

@app.route('/test', methods=['GET'])
def test():
    """
    Health check
    ---
    tags:
      - Test
    responses:
      200:
        description: Server is running
    """
    return jsonify({"message": "Server is running"})

@app.route('/user/get/data', methods=['GET'])
def pm_get():
    """
    Get current PM data
    ---
    parameters:
      - in: query
        name: username
        type: string
        required: true
      - in: query
        name: begin_time
        type: string
        format: YYYY-MM-DD HH:MM:SS.mmmmmm
        required: true
      - in: query
        name: end_time
        type: string
        format: YYYY-MM-DD HH:MM:SS.mmmmmm
        required: false
    tags:
      - User
    responses:
      200:
        description: PM data
    """
    username = request.args.get("username")
    begin_time = request.args.get("begin_time")
    #uses ISO 8601 date standard
    end_time = request.args.get("end_time", datetime.now(timezone.utc).replace(microsecond=0).isoformat())

    return jsonify(database.get_readings(username,begin_time, end_time))

@app.route('/user/get/readings', methods=['GET'])
def get_readings():
    """
    Get sensor readings for a user within a timeframe
    ---
    parameters:
      - in: query
        name: username
        type: string
        required: true
      - in: query
        name: begin_time
        type: string
        format: ISO 8601
        required: true
      - in: query
        name: end_time
        type: string
        format: ISO 8601
        required: false
    tags:
      - User
    responses:
      200:
        description: List of sensor readings
      400:
        description: Missing required parameters
    """
    username = request.args.get("username")
    begin_time = request.args.get("begin_time")

    if not username or not begin_time:
        return jsonify({"error": "username and begin_time are required"}), 400

    end_time = request.args.get("end_time", datetime.now(timezone.utc).replace(microsecond=0).isoformat())

    readings = database.get_readings(username, begin_time, end_time)
    return jsonify({"readings": readings})

@app.route('/user/add/data', methods=['POST'])
def pm_store():
    """
    Store a PM user reading
    ---
    tags:
      - User
    parameters:
      - in: body
        name: body
        schema:
          type: object
          properties:
            username:
              type: string
            pm:
              type: number
            timestamp:
              type: string
            longitude:
              type: number
            latitude:
              type: number
    responses:
      200:
        description: PM reading stored
    """
    data = request.get_json()
    username = data.get('username')
    pm = data.get('pm')
    timestamp = data.get('timestamp')
    longitude = data.get('longitude')
    latitude = data.get('latitude')
    database.insert_user_reading(username, pm, timestamp, longitude, latitude)
    return jsonify({"message": str(username) + " added:" + " " + str(pm) + " " + str(timestamp) + " " + str(latitude) + " " + str(longitude)})

@app.route('/user/init', methods=['POST'])
def init_user():
    """
    Initialize a user
    ---
    tags:
      - User
    parameters:
      - in: body
        name: body
        schema:
          type: object
          properties:
            username:
              type: string
    responses:
      200:
        description: user initialized
    """
    data = request.get_json()
    username = data.get('username')

    if database.user_exists(username):
        return jsonify({"success": False})

    database.insert_user(username)
    return jsonify({"success": True})


@app.route('/session/login', methods=['POST'])
def session_login():
    """
    User login
    ---
    tags:
      - Session
    parameters:
      - in: body
        name: body
        schema:
          type: object
          properties:
            username:
              type: string
    responses:
      200:
        description: Login successful
    """
    data = request.get_json()
    username = data.get("username")
    if not database.user_exists(username):
      return jsonify({"success": False})  

    return jsonify({"success": True})

@app.route('/session/logout(depreciated)', methods=['POST'])
def session_logout():
    """
    User logout
    ---
    tags:
      - Session
    responses:
      200:
        description: Logout successful
    """
    data = request.get_json()
    return jsonify({"message": ""})

@app.route('/game/get/data', methods=['GET'])
def get_game_state():
    """
    Get game state
    ---
    tags:
      - Game
    parameters:
      - in: query
        name: username
        type: string
    responses:
      200:
        description: Game state data
    """
    username = request.args.get("username")

    print(username,"asdasd")
    game_state = database.retrieve_game_state(username)

    return jsonify({"state": game_state })

@app.route('/game/save/data', methods=['POST'])
def save_game_state():
    """
    Save game state
    ---
    parameters:
      - in: body
        name: body
        schema:
          type: object
          properties:
            username:
              type: string
            map:
              type: string
            foodAmount:
              type: number
            airQuality:
              type: number
            populations:
              type: array
            lastUpdate:
              type: number
    tags:
      - Game
    responses:
      200:
        description: Game state saved
    """
    data = request.get_json()
    username = data.get('username')
    map = data.get('map')
    food_amount = data.get('foodAmount')
    air_quality = data.get('airQuality')
    populations = data.get('population')
    last_update = data.get('lastUpdate')

    database.save_game_state(username, map, food_amount, air_quality, populations, last_update)
    return jsonify({"success": True})

if __name__ == '__main__':
    app.run(debug=True)