/**
 * Módulo de lógica de negocio (aprobación de materias, promedio, casos
 * particulares), interacción con el banner superior y comunicación con la API.
 */
FCEGraph.app = (function () {

	const datos = FCEGraph.datos;
	const diagrama = FCEGraph.diagrama;
	let seSeleccionoUnaMateria = false;

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
		const numero = Number(valorIngresado);
		if (numero < FCEGraph.LIMITES.NOTA_MIN || numero > FCEGraph.LIMITES.NOTA_MAX) return false;
		return Number.isInteger(numero);
	}

	function validarAplazos(valorIngresado) {
		const numero = Number(valorIngresado);
		return Number.isInteger(numero) && numero >= 0;
	}

	/* ---------- Utilidades de UI ---------- */

	function mostrarElementosDeClase(nombreClase, tipoDisplay) {
		const lista = document.getElementsByClassName(nombreClase);
		for (const elemento of lista) elemento.style.display = tipoDisplay;
	}

	function esperarDiagramaCargado() {
		return new Promise(resolve => {
			if (diagrama.instancia.isInitialLayoutCompleted) {
				resolve();
				return;
			}
			function listener() {
				diagrama.instancia.removeDiagramListener("InitialLayoutCompleted", listener);
				resolve();
			}
			diagrama.instancia.addDiagramListener("InitialLayoutCompleted", listener);
		});
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

	function modificarNota(nodo, notaIngresada) {
		if (notaIngresada === "") {
			removerMateriaAprobada(nodo);
			return;
		}
		if (validarNota(notaIngresada)) {
			aprobarMateria(nodo, notaIngresada);
		} else {
			elementos.nota.value = "";
			elementos.nota.focus();
		}
	}

	function actualizarNota(nodo, valorNuevo, contexto) {
		if (!nodo) return;
		modificarNota(nodo, valorNuevo);
		actualizarPromedio();
		actualizarEstadoCorrelativas(nodo.data.key, contexto);
		diagrama.vistaPorDefecto();
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
		await esperarDiagramaCargado();
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
		const aplazosValidados = validarAplazos(elementos.aplazos.value) ? elementos.aplazos.value : "";

		FCEGraph.estadoSesion.carrerasDelAlumno[carrera] = encontrarNotasDeMateriasAprobadas();

		return {
			registro: Number(registro),
			carreras: FCEGraph.estadoSesion.carrerasDelAlumno,
			aplazos: aplazosValidados
		};
	}

	async function buscarAlumno() {
		const registro = elementos.registro.value;
		if (!validarRegistro(registro)) return;

		try {
			const respuesta = await fetch(`${FCEGraph.URL_BASE_API}/alumnos/registro/${registro}`);
			if (!respuesta.ok) throw new Error('No se encontró un alumno con ese registro.');
			const alumno = await respuesta.json();

			FCEGraph.estadoSesion.registroActual = alumno.registro;
			FCEGraph.estadoSesion.carrerasDelAlumno = alumno.carreras || {};
			FCEGraph.estadoSesion.aplazos = alumno.aplazos ?? "";

			const carreraDeMayorAvance = encontrarCarreraDeMayorAvance(alumno.carreras || {});
			if (carreraDeMayorAvance) {
				await datos.cargarCarrera(carreraDeMayorAvance);
				elementos.opciones.value = carreraDeMayorAvance;
				await aplicarNotasGuardadas(alumno.carreras[carreraDeMayorAvance] || []);
			}

			elementos.aplazos.value = FCEGraph.estadoSesion.aplazos;
			actualizarPromedio();
		} catch (error) {
			console.error('Error buscando alumno:', error.message);
		}
	}

	async function guardarAlumno() {
		const registro = elementos.registro.value;
		if (!validarRegistro(registro)) return;

		const payload = generarPayloadAlumno();

		try {
			const respuestaBusqueda = await fetch(`${FCEGraph.URL_BASE_API}/alumnos/registro/${registro}`);

			if (respuestaBusqueda.ok) {
				await fetch(`${FCEGraph.URL_BASE_API}/alumnos/registro/${registro}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
			} else {
				await fetch(`${FCEGraph.URL_BASE_API}/alumnos`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
			}
		} catch (error) {
			console.error('Error guardando alumno:', error.message);
		}
	}

	async function eliminarAlumno() {
		const registro = elementos.registro.value;
		if (registro === "") return;

		try {
			await fetch(`${FCEGraph.URL_BASE_API}/alumnos/registro/${registro}`, { method: 'DELETE' });
			elementos.registro.value = "";
			await datos.cargarCarrera(elementos.opciones.value);
		} catch (error) {
			console.error('Error eliminando alumno:', error.message);
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
				actualizarPromedio();
			} else {
				elementos.aplazos.value = "";
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
		});

		diagrama.instancia.addDiagramListener("ObjectSingleClicked", (e) => {
			const nodoClickeado = e.subject.part;
			if (!nodoClickeado || !nodoClickeado.data) return;

			mostrarElementosDeClase("subject-actions", nodoClickeado.data.nota !== "" ? "flex" : "none");

			elementos.detalles.classList.add("has-selection");
			elementos.materia.innerText = nodoClickeado.data.text;
			elementos.materia.style.fontWeight = "bold";
			elementos.hsSemanales.innerText = nodoClickeado.data.hs_semanales;
			elementos.departamento.innerText = nodoClickeado.data.depto;
			elementos.nota.value = nodoClickeado.data.nota;
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

		// elementos.opciones.value = "LA";
		// datos.cargarCarrera("LA");

		datos.cargarCarrera(elementos.opciones.value);
	}

	function inicializarToggleTema() {
		const boton = document.getElementById('themeToggle');
		if (!boton) return;
		boton.addEventListener('click', () => {
			const esClaro = document.body.classList.contains('theme-light');
			document.body.classList.toggle('theme-light', !esClaro);
			document.body.classList.toggle('theme-dark', esClaro);
			boton.classList.toggle('light', !esClaro);
			FCEGraph.diagrama.cambiarTema();
		});
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
