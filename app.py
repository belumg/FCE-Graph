#pip install flask flask-pymongo python-dotenv

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_pymongo import PyMongo
from bson.objectid import ObjectId
from bson.json_util import dumps
from dotenv import load_dotenv
import os

load_dotenv()
app = Flask(__name__)
# CORS(app, origins=["http://localhost:3000"]) # permite solo los origenes de mi frontend
CORS(app)
app.config["MONGO_URI"] = os.getenv("MONGO_URI")
mongo = PyMongo(app)
db = mongo.db

# Recuperar todos los registros guardados.
@app.route('/alumnos', methods=['GET'])
def obtener_todos():
    alumnos = db.alumnos.find()
    return dumps(alumnos), 200

# Consultar por número de registro.
@app.route('/alumnos/registro/<int:registro>', methods=['GET'])
def obtener_por_registro(registro):
    alumno = db.alumnos.find_one({"registro": registro})
    if alumno:
        return dumps(alumno), 200
    else:
        return jsonify({"error": "No encontrado"}), 404
    
# Posible mejora
# if alumno:
#         return jsonify(alumno), 200
#     else:
#         return jsonify({"error": "No encontrado"}), 404

# Ruta para eliminar un alumno por registro
@app.route('/alumnos/registro/<int:registro>', methods=['DELETE'])
def eliminar_alumno(registro):
    try:
        resultado = db.alumnos.delete_one({"registro": registro})
        if resultado.deleted_count == 0:
            return jsonify({"error": "Alumno no encontrado"}), 404
        return jsonify({"mensaje": "Alumno eliminado"}), 200
    except:
        return jsonify({"error": "Registro inválido"}), 400


@app.route('/alumnos', methods=['POST'])
def crear_alumno():
    data = request.get_json()

    resultado = db.alumnos.insert_one(data)

    return jsonify({
        "mensaje": "Alumno creado",
        "id": str(resultado.inserted_id)
    }), 201


# Actualizar datos.
@app.route('/alumnos/registro/<int:registro>', methods=['PUT'])
def actualizar_data_alumno(registro):
    data = request.get_json()

    resultado = db.alumnos.update_one(
        {'registro': registro},
        {'$set': data}
    )
    
    if resultado.matched_count > 0:
        return jsonify({'mensaje': 'Usuario actualizado correctamente'})
    else:
        return jsonify({'error': 'Usuario no encontrado'}), 404


def usuario_serializer(usuario):
    usuario['_id'] = str(usuario['_id'])
    return usuario


# CREATE
@app.route('/alumnos', methods=['POST'])
def agregar_nuevo_alumno():
    data = request.get_json()

    # Validación simple de campos obligatorios
    registro = data.get("registro")
    carreras = data.get("carreras")
    aplazos = data.get("aplazos")

    if not registro or not carreras or not aplazos:
        return jsonify({"error": "Faltan campos obligatorios"}), 400

    nueva_data = {
        "registro": registro,
        "carreras": carreras,
        "aplazos": aplazos
    }
    
    resultado = db.alumnos.insert_one(nueva_data)
    
    nuevo_alumno = db.alumnos.find_one({"_id": resultado.inserted_id})

    return jsonify(usuario_serializer(nuevo_alumno)), 201


if __name__ == '__main__':
    app.run(debug=True, port=int(os.getenv("PORT", 5000)))
