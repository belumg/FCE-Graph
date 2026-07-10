# -*- coding: utf-8 -*-
"""Configuración centralizada de la aplicación."""

import os
from dotenv import load_dotenv

load_dotenv()


class Configuracion:
    """Configuración base leída desde variables de entorno."""

    URI_MONGO = os.getenv("MONGO_URI", "mongodb://localhost:27017/bd_fce_graph")
    PUERTO = int(os.getenv("PORT", 5000))
    ENTORNO = os.getenv("FLASK_ENV", "production")
    DEBUG = ENTORNO == "development"

    # Orígenes permitidos para CORS. En producción, definir ORIGENES_PERMITIDOS
    # como una lista separada por comas en las variables de entorno.
    _origenes_env = os.getenv("ORIGENES_PERMITIDOS", "")
    ORIGENES_PERMITIDOS = (
        [o.strip() for o in _origenes_env.split(",") if o.strip()]
        if _origenes_env
        else ["*"]
    )

    REGISTRO_MINIMO = 100000
    REGISTRO_MAXIMO = 2000000
