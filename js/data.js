/**
 * Módulo de carga de datos y manejo del estado de correlativas.
 * Se apoya en FCEGraph.diagrama (definido en diagram.js) para
 * dibujar el grafo, y expone su API pública en FCEGraph.datos.
 */
FCEGraph.datos = (function () {

	/* ---------- Estado interno del módulo ---------- */
	let estado = {};
	let modeloCorrelativas = [];
	let materiasPrimerTramo = [];
	let materiasAprobadas = [];
	let materiasDisponibles = [];
	let casosParticulares = [];
	let nodos = [];
	let links = [];

	// Única fuente de verdad para la materia actualmente seleccionada en el
	// diagrama. Antes cada consumidor (banner de detalles, validaciones,
	// etc.) leía por su cuenta campos sueltos directo del nodo de GoJS
	// (nodoClickeado.data.text, .hs_semanales, .depto, .nota...), lo que
	// dispersaba la data de la materia en varios lugares del código.
	// Ahora se arma un único objeto con la data relevante y todo lo demás
	// (UI, lógica de negocio) se apoya en él.
	let materiaSeleccionada = null;

	function establecerMateriaSeleccionada(nodo) {
		if (!nodo || !nodo.data) {
			materiaSeleccionada = null;
			return null;
		}
		materiaSeleccionada = {
			codigo: nodo.data.key,
			nombre: nodo.data.text,
			hsSemanales: nodo.data.hs_semanales,
			departamento: nodo.data.depto,
			nota: nodo.data.nota,
			categoria: nodo.data.categoria
		};
		return materiaSeleccionada;
	}

	function limpiarMateriaSeleccionada() {
		materiaSeleccionada = null;
	}

	/* ---------- Utilidades de red ---------- */

	async function obtenerLayout() {
		try {
			const respuesta = await fetch('data/layout.json?v=' + Date.now());
			if (!respuesta.ok) throw new Error('No se pudo cargar el layout.');
			return await respuesta.json();
		} catch (error) {
			console.error('Error cargando layout.json:', error);
			return null;
		}
	}

	async function obtenerEscala(carrera) {
		const data = await obtenerLayout();
		return data?.escala?.[carrera];
	}

	/* ---------- Posicionamiento de nodos ---------- */

	function simularMovimientoNodo(claveNodo, destinoX, destinoY) {
		const diagrama = FCEGraph.diagrama.instancia;
		const nodo = diagrama.findNodeForKey(claveNodo);
		if (!nodo) return;

		const nuevaUbicacion = nodo.location.copy();
		nuevaUbicacion.x = destinoX;
		nuevaUbicacion.y = destinoY;

		diagrama.startTransaction("Reacomodar nodo");
		nodo.location = nuevaUbicacion;
		diagrama.model.setDataProperty(
			nodo.data, "coordenadas", go.Point.stringify(nuevaUbicacion)
		);
		diagrama.commitTransaction("Reacomodar nodo");
	}

	async function reacomodarNodosConPadre(carrera) {
		const data = await obtenerLayout();
		const movimientos = data?.movimientos?.[carrera];
		if (!movimientos) return;
		movimientos.forEach(([clave, x, y]) => simularMovimientoNodo(clave, x, y));
	}

	async function fijarNodosSinPadre(carrera, nodosDiagrama) {
		const data = await obtenerLayout();
		const coordenadas = data?.coordenadas?.[carrera];
		if (!coordenadas) return;

		coordenadas.forEach(([clave, valor]) => {
			const nodo = nodosDiagrama.find(n => n.key === clave);
			if (nodo) nodo.coordenadas = valor;
		});
	}

	function ubicarPrimerTramo(materias, nodosDiagrama) {
		let y = 0;
		materias.forEach(codigoMateria => {
			const nodo = nodosDiagrama.find(n => n.key === codigoMateria);
			if (nodo) {
				nodo.coordenadas = `0 ${y}`;
				y += 120;
			}
		});
	}

	async function graficarLayout(nodosDiagrama, linksDiagrama, raiz, carrera, materiasDelPrimerTramo) {
		ubicarPrimerTramo(materiasDelPrimerTramo, nodosDiagrama);
		await fijarNodosSinPadre(carrera, nodosDiagrama);

		const diagrama = FCEGraph.diagrama.instancia;
		diagrama.model = new go.GraphLinksModel(nodosDiagrama, linksDiagrama);

		const nuevaRaiz = diagrama.findNodeForKey(raiz);
		if (nuevaRaiz) {
			diagrama.layout.root = nuevaRaiz;
			diagrama.layoutDiagram(true);
		}

		const escala = await obtenerEscala(carrera);
		await reacomodarNodosConPadre(carrera);

		if (escala) diagrama.scale = escala;
		diagrama.alignDocument(go.Spot.Center, go.Spot.Center);

		// La escala guardada en layout.json fue pensada para un contenedor de
		// tamaño "normal". Si el diagrama se está viendo en una vista reducida
		// (ventana angosta, embed chico, celular), esa escala fija puede quedar
		// más grande que lo que entra en pantalla. Reencuadramos siempre al
		// contenedor real para que la carga inicial ya se vea completa y bien
		// escalada, sin esperar a un resize posterior.
		// Esperamos un frame para que el layout del header (CSS) ya esté
		// aplicado y el contenedor del diagrama tenga su tamaño final antes
		// de calcular el ajuste; si no, en la primera carga se podía medir
		// un contenedor todavía "en transición" y quedar mal escalado.
		requestAnimationFrame(() => FCEGraph.diagrama.reencuadrarDiagrama());
	}

	/* ---------- Construcción del modelo de correlativas ---------- */

	function buscarCasosParticulares() {
		for (const clave in estado) {
			if (estado[clave][0] === "**" && !casosParticulares.includes(Number(clave))) {
				casosParticulares.push(Number(clave));
			}
		}
	}

	function asignarCorrelativasPrimerTramo() {
		for (const clave in estado) {
			if (estado[clave][0] === "*") {
				estado[clave] = materiasPrimerTramo;
				materiasPrimerTramo.forEach(codigoMateria => {
					const destino = clave.charAt(0) === "#" ? clave : Number(clave);
					modeloCorrelativas.push({ from: Number(codigoMateria), to: destino });
				});
			}
		}
		materiasPrimerTramo.forEach(codigoMateria => { estado[codigoMateria] = []; });
	}

	function procesarCorrelativasDeMateria(materia, listaCorrelativas) {
		listaCorrelativas.forEach(requisitoPrevio => {
			if (!estado[materia.codigo]) estado[materia.codigo] = [];

			if (requisitoPrevio !== "*" && requisitoPrevio !== "**") {
				modeloCorrelativas.push({ from: requisitoPrevio, to: materia.codigo });
				links.push({ from: requisitoPrevio, to: materia.codigo, color: FCEGraph.COLOR_ENLACE_DEFAULT });
			}
			estado[materia.codigo].push(requisitoPrevio);
		});
	}

	function reiniciarEstado() {
		estado = {};
		modeloCorrelativas = [];
		materiasPrimerTramo = [];
		materiasAprobadas = [];
		materiasDisponibles = [];
		casosParticulares = [];
		nodos = [];
		links = [];
		if (window.detener_confeti) window.detener_confeti();
	}

	/* ---------- Carga principal ---------- */

	async function cargarCarrera(carrera) {
		try {
			const respuesta = await fetch(`data/${carrera}.json?v=${Date.now()}`);
			if (!respuesta.ok) throw new Error(`No se pudo cargar la carrera ${carrera}.`);
			const materias = await respuesta.json();

			reiniciarEstado();

			materias.forEach(materia => {
				if (materia.caracter !== "Obligatoria") return;

				if (materia.categoria === "Primer Tramo") {
					materiasPrimerTramo.push(materia.codigo);
				}

				nodos.push({
					key: materia.codigo,
					text: materia.materia,
					categoria: materia.categoria,
					hs_semanales: materia.hs_semanales,
					depto: materia.departamento,
					mostrar_nota: false,
					nota: "",
					coordenadas: ""
				});

				procesarCorrelativasDeMateria(materia, materia.correlativas);
			});

			asignarCorrelativasPrimerTramo();
			buscarCasosParticulares();
			await graficarLayout(nodos, links, 242, carrera, materiasPrimerTramo);
		} catch (error) {
			console.error('Error cargando datos de la carrera:', error);
		}
	}

	/* ---------- API pública ---------- */

	return {
		cargarCarrera,
		reiniciarEstado,
		establecerMateriaSeleccionada,
		limpiarMateriaSeleccionada,
		// Getters: exponen el estado de forma controlada (sin permitir reemplazo externo directo).
		get estado() { return estado; },
		get modeloCorrelativas() { return modeloCorrelativas; },
		get materiasPrimerTramo() { return materiasPrimerTramo; },
		get materiasAprobadas() { return materiasAprobadas; },
		set materiasAprobadas(valor) { materiasAprobadas = valor; },
		get materiasDisponibles() { return materiasDisponibles; },
		set materiasDisponibles(valor) { materiasDisponibles = valor; },
		get casosParticulares() { return casosParticulares; },
		get nodos() { return nodos; },
		get links() { return links; },
		get materiaSeleccionada() { return materiaSeleccionada; }
	};
})();
