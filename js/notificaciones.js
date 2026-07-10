/**
 * Módulo simple de notificaciones tipo "toast".
 * Permite mostrar mensajes de éxito, error, advertencia e información
 * en la esquina inferior derecha, sin bloquear la interacción del usuario.
 */
FCEGraph.notificaciones = (function () {

	const ICONOS = {
		success: 'fa-solid fa-circle-check',
		error: 'fa-solid fa-circle-xmark',
		warning: 'fa-solid fa-triangle-exclamation',
		info: 'fa-solid fa-circle-info'
	};

	const DURACION_MS = 4000;

	function obtenerContenedor() {
		return document.getElementById('toast-container');
	}

	function mostrar(mensaje, tipo = 'info', duracion = DURACION_MS) {
		const contenedor = obtenerContenedor();
		if (!contenedor) return;

		const toast = document.createElement('div');
		toast.className = `toast ${tipo}`;

		const icono = document.createElement('i');
		icono.className = `toast-icon ${ICONOS[tipo] || ICONOS.info}`;

		const texto = document.createElement('span');
		texto.className = 'toast-message';
		texto.innerText = mensaje;

		const cerrar = document.createElement('button');
		cerrar.className = 'toast-close';
		cerrar.type = 'button';
		cerrar.setAttribute('aria-label', 'Cerrar notificación');
		cerrar.innerHTML = '<i class="fa-solid fa-xmark"></i>';

		function quitar() {
			toast.style.animation = 'slideIn 200ms ease-in reverse';
			setTimeout(() => toast.remove(), 180);
		}

		cerrar.addEventListener('click', quitar);

		toast.appendChild(icono);
		toast.appendChild(texto);
		toast.appendChild(cerrar);
		contenedor.appendChild(toast);

		if (duracion > 0) {
			setTimeout(quitar, duracion);
		}
	}

	function exito(mensaje, duracion) { mostrar(mensaje, 'success', duracion); }
	function error(mensaje, duracion) { mostrar(mensaje, 'error', duracion); }
	function advertencia(mensaje, duracion) { mostrar(mensaje, 'warning', duracion); }
	function info(mensaje, duracion) { mostrar(mensaje, 'info', duracion); }

	return { mostrar, exito, error, advertencia, info };
})();
