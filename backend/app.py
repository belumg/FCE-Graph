# -*- coding: utf-8 -*-
"""
API REST de FCE-Graph.

Expone endpoints CRUD sobre la colección 'alumnos' de MongoDB.
Requiere: flask, flask-cors, flask-pymongo, python-dotenv
  pip install flask flask-cors flask-pymongo python-dotenv
"""

import logging

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_pymongo import PyMongo

from config import Configuracion
from modelos import (
    ErrorValidacion,
    RepositorioAlumnos,
    normalizar_documento_alumno,
    serializar_documento,
    validar_registro,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fce-graph")


def crear_app():
    """Application factory: crea y configura la instancia de Flask."""
    app = Flask(__name__)
    CORS(app, origins=Configuracion.ORIGENES_PERMITIDOS)

    app.config["MONGO_URI"] = Configuracion.URI_MONGO
    mongo = PyMongo(app)
    repositorio = RepositorioAlumnos(mongo.db.alumnos)

    registrar_rutas(app, repositorio)
    registrar_manejadores_de_error(app)

    return app


def registrar_rutas(app, repositorio):

    @app.route("/salud", methods=["GET"])
    def verificar_salud():
        """Endpoint simple para chequeos de disponibilidad (health check)."""
        return jsonify({"estado": "ok"}), 200

    @app.route("/alumnos", methods=["GET"])
    def obtener_todos():
        alumnos = repositorio.obtener_todos()
        return jsonify(serializar_documento(alumnos)), 200

    @app.route("/alumnos/registro/<int:registro>", methods=["GET"])
    def obtener_por_registro(registro):
        alumno = repositorio.buscar_por_registro(registro)
        if not alumno:
            return jsonify({"error": "No se encontró un alumno con ese registro."}), 404
        return jsonify(serializar_documento(alumno)), 200

    @app.route("/alumnos", methods=["POST"])
    def crear_alumno():
        payload = request.get_json(silent=True) or {}
        documento = normalizar_documento_alumno(payload)

        if repositorio.existe(documento["registro"]):
            return jsonify({"error": "Ya existe un alumno con ese registro."}), 409

        alumno_creado = repositorio.crear(documento)
        return jsonify(serializar_documento(alumno_creado)), 201

    @app.route("/alumnos/registro/<int:registro>", methods=["PUT"])
    def actualizar_alumno(registro):
        payload = request.get_json(silent=True) or {}
        # Se reutiliza el registro de la URL como fuente de verdad.
        payload["registro"] = registro
        documento = normalizar_documento_alumno(payload)

        actualizado = repositorio.actualizar(registro, documento)
        if not actualizado:
            return jsonify({"error": "Alumno no encontrado."}), 404
        return jsonify({"mensaje": "Alumno actualizado correctamente."}), 200

    @app.route("/alumnos/registro/<int:registro>", methods=["DELETE"])
    def eliminar_alumno(registro):
        validar_registro(registro)
        eliminado = repositorio.eliminar(registro)
        if not eliminado:
            return jsonify({"error": "Alumno no encontrado."}), 404
        return jsonify({"mensaje": "Alumno eliminado correctamente."}), 200


def registrar_manejadores_de_error(app):

    @app.errorhandler(ErrorValidacion)
    def manejar_error_validacion(error):
        return jsonify({"error": str(error)}), 400

    @app.errorhandler(404)
    def manejar_no_encontrado(error):
        return jsonify({"error": "Recurso no encontrado."}), 404

    @app.errorhandler(Exception)
    def manejar_error_inesperado(error):
        logger.exception("Error inesperado procesando la solicitud")
        return jsonify({"error": "Error interno del servidor."}), 500


app = crear_app()

if __name__ == "__main__":
    app.run(debug=Configuracion.DEBUG, port=Configuracion.PUERTO)
