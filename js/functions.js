/**
 * Módulo de lógica de negocio (aprobación de materias, promedio, casos
 * particulares), interacción con el banner superior y comunicación con la API.
 */
FCEGraph.app = (function () {

	const datos = FCEGraph.datos;
	const diagrama = FCEGraph.diagrama;
	let seSeleccionoUnaMateria = false;
	// Guarda el último valor de aplazos que fue válido, para poder restaurarlo
	// si el usuario ingresa algo inválido (en vez de resetear siempre a 0).
	let ultimoAplazosValido = 0;

	/* ---------- Referencias al DOM (cacheadas una sola vez) ---------- */

	const elementos = {
		opciones: document.getElementById('opciones'),
		registro: document.getElementById('registro'),
		buscar: document.getElementById('buscar'),
		guardar: document.getElementById('guardar'),
		eliminar: document.getElementById('eliminar'),
		contenedorIzquierda: document.getElementById('contenedor-izquierda'),
		detalles: document.getElementById('detalles'),
		materia: document.getElementById('materia'),
		hsSemanales: document.getElementById('hs_semanales'),
		departamento: document.getElementById('departamento'),
		nota: document.getElementById('nota'),
		ok: document.getElementById('ok'),
		notOk: document.getElementById('not-ok'),
		aplazos: document.getElementById('aplazos'),
		promedio: document.getElementById('promedio')
	};

	/* ---------- Utilidades de validación ---------- */

	function validarRegistro(valorIngresado) {
		const numero = Number(valorIngresado);
		if (numero < FCEGraph.LIMITES.REGISTRO_MIN || numero > FCEGraph.LIMITES.REGISTRO_MAX) return false;
		return Number.isInteger(numero);
	}

	function validarNota(valorIngresado) {
		if (valorIngresado === "" || valorIngresado === null || valorIngresado === undefined) return false;
		// Number(" ") o Number("") dan 0, y algunos navegadores pueden dejar
		// pasar espacios o strings vacíos en un input number; nos aseguramos
		// de que el valor realmente tenga contenido numérico antes de validar.
		if (typeof valorIngresado === "string" && valorIngresado.trim() === "") return false;
		const numero = Number(valorIngresado);
		if (Number.isNaN(numero)) return false;
		if (numero < FCEGraph.LIMITES.NOTA_MIN || numero > FCEGraph.LIMITES.NOTA_MAX) return false;
		return Number.isInteger(numero);
	}

	function validarAplazos(valorIngresado) {
		if (valorIngresado === "" || valorIngresado === null || valorIngresado === undefined) return false;
		if (typeof valorIngresado === "string" && valorIngresado.trim() === "") return false;
		const numero = Number(valorIngresado);
		if (Number.isNaN(numero)) return false;
		return Number.isInteger(numero) && numero >= 0;
	}

	/* ---------- Utilidades de UI ---------- */

	function mostrarElementosDeClase(nombreClase, tipoDisplay) {
		const lista = document.getElementsByClassName(nombreClase);
		for (const elemento of lista) elemento.style.display = tipoDisplay;
	}

	/* ---------- Lógica de negocio: correlativas y estado ---------- */

	function finDeCarrera() {
		return datos.materiasAprobadas.length === Object.keys(datos.estado).length;
	}

	function primerTramoCompleto() {
		return datos.materiasPrimerTramo.every(materia => datos.materiasAprobadas.includes(materia));
	}

	function verificarCasosParticulares(contexto) {
		const estado = datos.estado;
		datos.casosParticulares.forEach(codigo => {
			const habilitaCasoParticular = primerTramoCompleto() && datos.materiasAprobadas.length >= 23;
			if (habilitaCasoParticular && contexto === "agregar") {
				estado[codigo] = [];
			} else if (!habilitaCasoParticular && contexto === "quitar") {
				estado[codigo] = ["**"];
			}
		});
	}

	function actualizarEstadoCorrelativas(claveNodo, contexto) {
		const estado = datos.estado;
		if (contexto === "agregar") {
			for (const clave in estado) {
				estado[clave] = estado[clave].filter(item => item !== claveNodo);
			}
		}
		if (contexto === "quitar") {
			datos.modeloCorrelativas.forEach(enlace => {
				if (enlace.from === claveNodo) estado[enlace.to].push(enlace.from);
			});
		}
		verificarCasosParticulares(contexto);
	}

	/* ---------- Lógica de negocio: notas y promedio ---------- */

	function actualizarPromedio() {
		let suma = 0;
		datos.materiasAprobadas.forEach(claveMateria => {
			const nodo = diagrama.instancia.findNodeForKey(claveMateria);
			if (nodo) suma += Number(nodo.data.nota);
		});

		const cantidadAplazos = Number(elementos.aplazos.value) || 0;
		let promedio = "-";
		if (suma !== 0 && datos.materiasAprobadas.length > 0) {
			promedio = ((suma + 2 * cantidadAplazos) / (datos.materiasAprobadas.length + cantidadAplazos)).toFixed(2);
		}
		elementos.promedio.innerText = promedio;
	}

	function aprobarMateria(nodo, notaIngresada) {
		const modelo = diagrama.instancia.model;
		modelo.startTransaction("Modificar nota");
		modelo.setDataProperty(nodo.data, "mostrar_nota", true);
		modelo.setDataProperty(nodo.data, "nota", notaIngresada);
		modelo.commitTransaction("Modificar nota");

		diagrama.cambiarColorNodo(nodo, FCEGraph.TEMA_NODO_DESTACADO);
		diagrama.mostrarDetalleBorde(nodo.data.key, false);

		if (!datos.materiasAprobadas.includes(nodo.data.key)) {
			datos.materiasAprobadas.push(nodo.data.key);
		}

		seSeleccionoUnaMateria = true;
		if (finDeCarrera() && window.lanzar_confeti) window.lanzar_confeti();
	}

	function removerMateriaAprobada(nodo) {
		const modelo = diagrama.instancia.model;
		modelo.startTransaction("Modificar nota");
		modelo.setDataProperty(nodo.data, "mostrar_nota", false);
		modelo.setDataProperty(nodo.data, "nota", "");
		modelo.commitTransaction("Modificar nota");

		diagrama.cambiarColorNodo(nodo, tema_nodo_default());
		diagrama.mostrarDetalleBorde(nodo.data.key, true);

		datos.materiasAprobadas = datos.materiasAprobadas.filter(item => item !== nodo.data.key);
		seSeleccionoUnaMateria = false;
		if (window.detener_confeti) window.detener_confeti();
	}

	function tema_nodo_default() {
		const tm = diagrama.instancia.themeManager;
		return {
			fondo: tm.findValue("colors.background"),
			texto: tm.findValue("colors.text"),
			badge: tm.findValue("colors.badge"),
			badge_borde: tm.findValue("colors.badgeBorder"),
			badge_texto: tm.findValue("colors.badgeText")
		};
	}

	function modificarNota(nodo, notaIngresada, contexto) {
		// El borrado de nota solo ocurre cuando viene explícitamente desde la
		// cruz (contexto "quitar"). Si el contexto es "agregar" (Enter o tick),
		// un campo vacío o con texto no numérico es una entrada inválida, no
		// una intención de quitar la materia aprobada.
		if (contexto === "quitar" && notaIngresada === "") {
			removerMateriaAprobada(nodo);
			return true;
		}
		if (validarNota(notaIngresada)) {
			aprobarMateria(nodo, notaIngresada);
			return true;
		}
		elementos.nota.value = "";
		elementos.nota.focus();
		FCEGraph.notificaciones.advertencia('Ingresá una nota válida.');
		return false;
	}

	function actualizarNota(nodo, valorNuevo, contexto) {
		if (!nodo) return;
		const seAplico = modificarNota(nodo, valorNuevo, contexto);
		actualizarPromedio();

		// Si la nota ingresada no era válida, no hay ningún cambio de estado
		// que propagar y el usuario debe permanecer en el menú de carga de
		// nota (con el input ya vacío) para poder reintentar.
		if (!seAplico) return;

		actualizarEstadoCorrelativas(nodo.data.key, contexto);
		diagrama.vistaPorDefecto();

		// Tras cargar/quitar una nota (Enter, tick o cruz), el banner vuelve
		// al estado "sin selección": se oculta el menú especial de nota y se
		// deselecciona la materia, tanto en el diagrama como en los datos.
		diagrama.instancia.clearSelection();
		datos.limpiarMateriaSeleccionada();
		elementos.detalles.classList.remove("has-selection");
		mostrarElementosDeClase("subject-actions", "none");
	}

	/* ---------- Comunicación con el backend ---------- */

	function encontrarCarreraDeMayorAvance(carrerasDelAlumno) {
		let mayorAvance = 0;
		let carreraEncontrada = "";

		for (const codigoCarrera in carrerasDelAlumno) {
			const totalMaterias = FCEGraph.CANTIDAD_MATERIAS_POR_CARRERA[codigoCarrera];
			if (!totalMaterias) continue;
			const avanceActual = carrerasDelAlumno[codigoCarrera].length / totalMaterias;
			if (avanceActual > mayorAvance) {
				mayorAvance = avanceActual;
				carreraEncontrada = codigoCarrera;
			}
		}
		return carreraEncontrada;
	}

	async function aplicarNotasGuardadas(materiasAprobadasConNota) {
		materiasAprobadasConNota.forEach(([codigo, nota]) => {
			const nodo = diagrama.instancia.findNodeForKey(codigo);
			if (nodo) actualizarNota(nodo, nota, "agregar");
		});
	}

	function encontrarNotasDeMateriasAprobadas() {
		return datos.materiasAprobadas
			.map(codigo => {
				const nodo = diagrama.instancia.findNodeForKey(codigo);
				return nodo ? [codigo, Number(nodo.data.nota)] : null;
			})
			.filter(Boolean);
	}

	function generarPayloadAlumno() {
		const registro = elementos.registro.value;
		const carrera = elementos.opciones.value;
		const aplazosValidados = validarAplazos(elementos.aplazos.value) ? elementos.aplazos.value : 0;

		FCEGraph.estadoSesion.carrerasDelAlumno[carrera] = encontrarNotasDeMateriasAprobadas();

		return {
			registro: Number(registro),
			carreras: FCEGraph.estadoSesion.carrerasDelAlumno,
			aplazos: aplazosValidados
		};
	}

	async function buscarAlumno() {
		const registro = elementos.registro.value;
		if (!validarRegistro(registro)) {
			elementos.registro.value = "";
			FCEGraph.notificaciones.advertencia('Ingresá un número de registro válido para buscar.');
			return;
		}

		try {
			const respuesta = await fetch(`${FCEGraph.URL_BASE_API}/alumnos/registro/${registro}`);
			if (!respuesta.ok) {
				if (respuesta.status === 404) {
					FCEGraph.notificaciones.advertencia(`No se encontró ningún alumno con el registro ${registro}.`);
					return;
				}
				throw new Error('No se encontró un alumno con ese registro.');
			}
			const alumno = await respuesta.json();

			FCEGraph.estadoSesion.registroActual = alumno.registro;
			FCEGraph.estadoSesion.carrerasDelAlumno = alumno.carreras || {};
			FCEGraph.estadoSesion.aplazos = alumno.aplazos ?? 0;

			const carreraDeMayorAvance = encontrarCarreraDeMayorAvance(alumno.carreras || {});
			if (carreraDeMayorAvance) {
				await datos.cargarCarrera(carreraDeMayorAvance);
				elementos.opciones.value = carreraDeMayorAvance;
				await aplicarNotasGuardadas(alumno.carreras[carreraDeMayorAvance] || []);
			}

			elementos.aplazos.value = FCEGraph.estadoSesion.aplazos;
			ultimoAplazosValido = validarAplazos(elementos.aplazos.value) ? elementos.aplazos.value : 0;
			actualizarPromedio();
		} catch (error) {
			console.error('Error buscando alumno:', error.message);
			FCEGraph.notificaciones.error('Ocurrió un error al buscar el alumno.');
		}
	}

	async function guardarAlumno() {
		const registro = elementos.registro.value;
		if (!validarRegistro(registro)) {
			elementos.registro.value = "";
			FCEGraph.notificaciones.advertencia('Ingresá un número de registro válido para guardar.');
			return;
		}

		const payload = generarPayloadAlumno();

		try {
			const respuestaBusqueda = await fetch(`${FCEGraph.URL_BASE_API}/alumnos/registro/${registro}`);

			if (respuestaBusqueda.ok) {
				const respuestaGuardado = await fetch(`${FCEGraph.URL_BASE_API}/alumnos/registro/${registro}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
				if (!respuestaGuardado.ok) throw new Error('No se pudo actualizar el registro.');
				FCEGraph.notificaciones.exito('Los cambios se guardaron correctamente.');
			} else {
				const respuestaGuardado = await fetch(`${FCEGraph.URL_BASE_API}/alumnos`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
				if (!respuestaGuardado.ok) throw new Error('No se pudo crear el registro.');
				FCEGraph.notificaciones.exito('El registro se creó correctamente.');
			}
		} catch (error) {
			console.error('Error guardando alumno:', error.message);
			FCEGraph.notificaciones.error('Ocurrió un error al guardar el alumno.');
		}
	}

	async function eliminarAlumno() {
		const registro = elementos.registro.value;
		if (registro === "") return;

		if (!validarRegistro(registro)) {
			elementos.registro.value = "";
			FCEGraph.notificaciones.advertencia('Ingresá un número de registro válido para eliminar.');
			return;
		}

		const confirmado = window.confirm(`¿Seguro que querés eliminar todos los datos asociados al registro ${registro}? Esta acción no se puede deshacer.`);
		if (!confirmado) return;

		try {
			const respuestaBusqueda = await fetch(`${FCEGraph.URL_BASE_API}/alumnos/registro/${registro}`);
			if (!respuestaBusqueda.ok) {
				FCEGraph.notificaciones.advertencia(`No se encontró ningún alumno con el registro ${registro}.`);
				return;
			}

			const respuestaBorrado = await fetch(`${FCEGraph.URL_BASE_API}/alumnos/registro/${registro}`, { method: 'DELETE' });
			if (!respuestaBorrado.ok) throw new Error('No se pudo eliminar el registro.');

			// Limpiamos el estado de sesión asociado al alumno borrado.
			elementos.registro.value = "";
			elementos.aplazos.value = 0;
			ultimoAplazosValido = 0;
			FCEGraph.estadoSesion.registroActual = null;
			FCEGraph.estadoSesion.carrerasDelAlumno = {};
			FCEGraph.estadoSesion.aplazos = 0;

			// Recargamos el graph de la carrera actual, sin nada pintado.
			await datos.cargarCarrera(elementos.opciones.value);
			elementos.detalles.classList.remove("has-selection");
			mostrarElementosDeClase("subject-actions", "none");
			actualizarPromedio();

			FCEGraph.notificaciones.exito('El registro se eliminó correctamente.');
		} catch (error) {
			console.error('Error eliminando alumno:', error.message);
			FCEGraph.notificaciones.error('Ocurrió un error al eliminar el alumno.');
		}
	}

	/* ---------- Eventos del banner superior ---------- */

	function inicializarEventosBanner() {
		elementos.opciones.addEventListener('change', async (evento) => {
			const carrera = evento.target.value;
			await datos.cargarCarrera(carrera);

			const registro = elementos.registro.value;
			if (validarRegistro(registro) && carrera in FCEGraph.estadoSesion.carrerasDelAlumno) {
				await aplicarNotasGuardadas(FCEGraph.estadoSesion.carrerasDelAlumno[carrera]);
			} else {
				elementos.registro.value = "";
			}
		});

		elementos.buscar.addEventListener('click', buscarAlumno);
		elementos.guardar.addEventListener('click', guardarAlumno);
		elementos.eliminar.addEventListener('click', eliminarAlumno);

		elementos.aplazos.addEventListener('change', () => {
			if (validarAplazos(elementos.aplazos.value)) {
				ultimoAplazosValido = elementos.aplazos.value;
				actualizarPromedio();
			} else {
				elementos.aplazos.value = ultimoAplazosValido;
				FCEGraph.notificaciones.advertencia('Ingresá una cantidad de aplazos válida.');
				actualizarPromedio();
			}
		});

		elementos.nota.addEventListener('keydown', (evento) => {
			if (evento.key === "Enter") {
				actualizarNota(diagrama.instancia.selection.first(), elementos.nota.value, "agregar");
			}
		});

		elementos.ok.addEventListener('click', () => {
			actualizarNota(diagrama.instancia.selection.first(), elementos.nota.value, "agregar");
		});

		elementos.notOk.addEventListener('click', () => {
			actualizarNota(diagrama.instancia.selection.first(), "", "quitar");
			elementos.nota.value = "";
			elementos.nota.focus();
		});
	}

	/* ---------- Eventos del diagrama ---------- */

	function inicializarEventosDiagrama() {
		diagrama.instancia.addDiagramListener("ObjectDoubleClicked", (e) => {
			mostrarElementosDeClase("subject-actions", "flex");
			elementos.nota.focus();

			const nodoClickeado = e.subject.part;
			if (!(nodoClickeado instanceof go.Node)) return;

			diagrama.instancia.model.commit(() => {
				if (!seSeleccionoUnaMateria) {
					elementos.nota.value = FCEGraph.LIMITES.NOTA_MIN;
					actualizarNota(nodoClickeado, elementos.nota.value, "agregar");
				} else {
					elementos.nota.value = "";
					actualizarNota(nodoClickeado, elementos.nota.value, "quitar");
				}
			}, "Cambiar color de nodo");
		});

		diagrama.instancia.addDiagramListener("BackgroundSingleClicked", () => {
			elementos.detalles.classList.remove("has-selection");
			datos.limpiarMateriaSeleccionada();
		});

		diagrama.instancia.addDiagramListener("ObjectSingleClicked", (e) => {
			const nodoClickeado = e.subject.part;
			if (!nodoClickeado || !nodoClickeado.data) return;

			// Toda la data de la materia se centraliza en un único objeto
			// (datos.materiaSeleccionada); la UI se pinta a partir de él en
			// vez de leer campos sueltos del nodo de GoJS en cada lugar.
			const materia = datos.establecerMateriaSeleccionada(nodoClickeado);

			mostrarElementosDeClase("subject-actions", materia.nota !== "" ? "flex" : "none");

			elementos.detalles.classList.add("has-selection");
			elementos.materia.innerText = materia.nombre;
			elementos.materia.style.fontWeight = "bold";
			elementos.hsSemanales.innerText = materia.hsSemanales;
			elementos.departamento.innerText = materia.departamento;
			elementos.nota.value = materia.nota;
			elementos.nota.focus();
		});

		diagrama.instancia.addDiagramListener("InitialLayoutCompleted", diagrama.vistaPorDefecto);
	}

	/* ---------- Inicialización general ---------- */

	function inicializar() {
		inicializarEventosBanner();
		inicializarEventosDiagrama();
		inicializarToggleTema();

		mostrarElementosDeClase("subject-actions", "none");
		elementos.detalles.classList.remove("has-selection");
		elementos.aplazos.value = 0;

		// elementos.opciones.value = "LA";
		// datos.cargarCarrera("LA");
		datos.cargarCarrera(elementos.opciones.value);
	}

	function inicializarToggleTema() {
		const boton = document.getElementById('themeToggle');
		if (!boton) return;

		function actualizarTooltip() {
			const esClaroActualmente = document.body.classList.contains('theme-light');
			// El tooltip siempre describe la acción: a qué tema se cambiará al hacer clic.
			const proximoTema = esClaroActualmente ? 'oscuro' : 'claro';
			const texto = `Cambiar a tema ${proximoTema}`;
			boton.title = texto;
			boton.setAttribute('aria-label', texto);
		}

		boton.addEventListener('click', () => {
			const esClaro = document.body.classList.contains('theme-light');
			document.body.classList.toggle('theme-light', !esClaro);
			document.body.classList.toggle('theme-dark', esClaro);
			boton.classList.toggle('light', !esClaro);
			FCEGraph.diagrama.cambiarTema();
			actualizarTooltip();
		});

		actualizarTooltip();
	}

	return {
		inicializar,
		validarRegistro,
		validarNota,
		validarAplazos
	};
})();

document.addEventListener('DOMContentLoaded', () => {
	FCEGraph.app.inicializar();
});
