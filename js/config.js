/**
 * Configuración global de la aplicación FCE-Graph.
 * Se expone bajo un único namespace (FCEGraph) para evitar contaminar
 * el scope global con variables sueltas.
 */
const FCEGraph = (function () {
	// En producción, reemplazar por la URL pública del backend desplegado
	// (por ejemplo, mediante una variable inyectada en el build o un meta tag).
	const metaApiUrl = document.querySelector('meta[name="api-base-url"]');
	const URL_BASE_API = (metaApiUrl && metaApiUrl.content) || "http://localhost:5000";

	const CANTIDAD_MATERIAS_POR_CARRERA = {
		AC: 31,
		AD: 13,
		CP: 33,
		LA: 28,
		LE: 29,
		LS: 32
	};

	const LIMITES = {
		REGISTRO_MIN: 100000,
		REGISTRO_MAX: 2000000,
		NOTA_MIN: 4,
		NOTA_MAX: 10
	};

	const TEMA_NODO_DESTACADO = {
		fondo: "#fa7942",
		texto: "#ffffff",
		badge: "#ffffff20",
		badge_borde: "#ffffff",
		badge_texto: "#ffffff"
	};

	const COLOR_ENLACE_DEFAULT = "#6b7280";
	const COLOR_ENLACE_DESTACADO = "#ef4444";

	return {
		URL_BASE_API,
		CANTIDAD_MATERIAS_POR_CARRERA,
		LIMITES,
		TEMA_NODO_DESTACADO,
		COLOR_ENLACE_DEFAULT,
		COLOR_ENLACE_DESTACADO,
		// Estado de sesión de la aplicación (reemplaza a las variables globales sueltas).
		estadoSesion: {
			registroActual: null,
			carrerasDelAlumno: {},
			aplazos: ""
		}
	};
})();
