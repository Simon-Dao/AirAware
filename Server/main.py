from flask import Flask, jsonify, request
from flask_cors import CORS
from flasgger import Swagger
from database import Database

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
def PM():
    """
    Get current PM data
    ---
    tags:
      - User
    responses:
      200:
        description: PM data
    """

    #get data from testing

    return jsonify({"pm": "this is a test"})

@app.route('/user/init', methods=['POST'])
def initUser():
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
    user_id = data.get('user_id')
    database.insertuser(user_id)
    return jsonify({"message": "User initialized", "user_id": user_id})

@app.route('/user/add/data', methods=['POST'])
def PMStore():
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
            user_id:
              type: string
            PM:
              type: number
            timestamp:
              type: string
    responses:
      200:
        description: PM reading stored
    """
    data = request.get_json()
    PM = data.get('PM')
    user_id = data.get('user_id')
    timestamp = data.get('timestamp')
    database.insertuserReading(user_id, PM, timestamp)
    return jsonify({"message": str(PM) + " " + str(timestamp)})

@app.route('/session/login', methods=['POST'])
def sessionLogin():
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
    return jsonify({"message": ""})

@app.route('/session/logout', methods=['POST'])
def sessionLogout():
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
def getGameState():
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
    return jsonify({"message": ""})

@app.route('/game/save/data', methods=['POST'])
def saveGameState():
    """
    Save game state
    ---
    tags:
      - Game
    responses:
      200:
        description: Game state saved
    """
    data = request.get_json()
    return jsonify({"message": ""})

if __name__ == '__main__':
    app.run(debug=True)