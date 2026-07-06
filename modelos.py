# -*- coding: utf-8 -*-
"""Capa de acceso y validación de datos de alumnos."""

from bson.json_util import dumps
import json


class ErrorValidacion(Exception):
    """Se lanza cuando los datos del alumno no cumplen el formato esperado."""


def validar_registro(registro):
    """Valida que el registro sea un entero dentro del rango esperado."""
    try:
        numero = int(registro)
    except (TypeError, ValueError):
        raise ErrorValidacion("El registro debe ser un número entero.")

    if numero < 100000 or numero > 2000000:
        raise ErrorValidacion("El registro está fuera del rango permitido.")

    return numero


def validar_carreras(carreras):
    """Valida la estructura del diccionario de carreras y notas."""
    if not isinstance(carreras, dict):
        raise ErrorValidacion("El campo 'carreras' debe ser un objeto.")

    for codigo_carrera, materias in carreras.items():
        if not isinstance(materias, list):
            raise ErrorValidacion(
                f"Las materias de la carrera '{codigo_carrera}' deben ser una lista."
            )
        for materia in materias:
            if (
                not isinstance(materia, (list, tuple))
                or len(materia) != 2
            ):
                raise ErrorValidacion(
                    "Cada materia debe tener el formato [codigo, nota]."
                )

    return carreras


def validar_aplazos(aplazos):
    """Valida que la cantidad de aplazos sea un entero no negativo (o vacío)."""
    if aplazos in ("", None):
        return ""
    try:
        numero = int(aplazos)
    except (TypeError, ValueError):
        raise ErrorValidacion("Los aplazos deben ser un número entero.")
    if numero < 0:
        raise ErrorValidacion("Los aplazos no pueden ser negativos.")
    return numero


def normalizar_documento_alumno(datos):
    """Valida y normaliza el payload recibido para crear/actualizar un alumno."""
    if "registro" not in datos:
        raise ErrorValidacion("Falta el campo obligatorio 'registro'.")
    if "carreras" not in datos:
        raise ErrorValidacion("Falta el campo obligatorio 'carreras'.")

    registro = validar_registro(datos["registro"])
    carreras = validar_carreras(datos["carreras"])
    aplazos = validar_aplazos(datos.get("aplazos", ""))

    return {
        "registro": registro,
        "carreras": carreras,
        "aplazos": aplazos,
    }


def serializar_documento(documento):
    """Convierte un documento de Mongo (con ObjectId) en JSON serializable."""
    return json.loads(dumps(documento))


class RepositorioAlumnos:
    """Encapsula las operaciones de persistencia sobre la colección 'alumnos'."""

    def __init__(self, coleccion):
        self._coleccion = coleccion

    def obtener_todos(self):
        return list(self._coleccion.find())

    def buscar_por_registro(self, registro):
        return self._coleccion.find_one({"registro": registro})

    def existe(self, registro):
        return self._coleccion.count_documents({"registro": registro}, limit=1) > 0

    def crear(self, documento):
        resultado = self._coleccion.insert_one(documento)
        return self._coleccion.find_one({"_id": resultado.inserted_id})

    def actualizar(self, registro, cambios):
        resultado = self._coleccion.update_one(
            {"registro": registro}, {"$set": cambios}
        )
        return resultado.matched_count > 0

    def eliminar(self, registro):
        resultado = self._coleccion.delete_one({"registro": registro})
        return resultado.deleted_count > 0
