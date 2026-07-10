/**
 * Módulo de configuración del diagrama (GoJS): temas, layout, nodos, enlaces
 * y utilidades visuales asociadas. Expone la instancia bajo FCEGraph.diagrama.
 */
FCEGraph.diagrama = (function () {

	const $ = go.GraphObject.make;

	/* ---------- Utilidades de interacción ---------- */

	// Evita que los nodos se encimen unos con otros al arrastrarlos.
	function evitarSuperposicion(parte, nuevaUbicacion) {
		const diagrama = parte.diagram;
		const nuevosBordes = parte.actualBounds.copy();
		nuevosBordes.position = nuevaUbicacion;

		let colisionan = false;
		diagrama.nodes.each(function (otro) {
			if (otro === parte) return;
			if (nuevosBordes.intersectsRect(otro.actualBounds)) colisionan = true;
		});

		return colisionan ? parte.location : nuevaUbicacion;
	}

	// Restaura la vista por defecto: enlaces neutros y solo materias disponibles resaltadas.
	function vistaPorDefecto() {
		const datos = FCEGraph.datos;
		const diagrama = instancia;

		diagrama.model.commit(m => {
			m.linkDataArray.forEach(enlace => m.set(enlace, "color", FCEGraph.COLOR_ENLACE_DEFAULT));
		}, "Restaurar color de enlaces.");

		calcularMateriasDisponibles(datos.estado, datos);

		diagrama.model.commit(m => {
			diagrama.nodes.each(nodo => {
				const disponible = datos.materiasDisponibles.includes(nodo.data.key);
				m.set(nodo.data, "oscurecer", !disponible);
			});
		}, "Oscurecer materias no disponibles.");
	}

	function calcularMateriasDisponibles(estado) {
		const disponibles = [];
		for (const clave in estado) {
			if (estado[clave][0] !== undefined) continue;
			const codigo = clave.charAt(0) === "#" ? clave : Number(clave);
			if (!disponibles.includes(codigo)) disponibles.push(codigo);
		}
		FCEGraph.datos.materiasDisponibles = disponibles;
	}

	// Resalta los enlaces y nodos conectados al nodo bajo el cursor.
	function destacarSeleccion(modeloCorrelativas, claveNodoSeleccionado) {
		const diagrama = instancia;
		const nodosAlcanzados = [];

		diagrama.startTransaction("Destacar enlaces.");
		modeloCorrelativas.forEach(enlace => {
			if (enlace.from !== claveNodoSeleccionado && enlace.to !== claveNodoSeleccionado) return;

			const enlaceReal = diagrama.model.linkDataArray.find(
				l => l.from === enlace.from && l.to === enlace.to
			);
			if (enlaceReal) diagrama.model.setDataProperty(enlaceReal, "color", FCEGraph.COLOR_ENLACE_DESTACADO);

			if (!nodosAlcanzados.includes(enlace.from)) nodosAlcanzados.push(enlace.from);
			if (!nodosAlcanzados.includes(enlace.to)) nodosAlcanzados.push(enlace.to);
		});
		diagrama.commitTransaction("Destacar enlaces.");

		diagrama.model.commit(m => {
			diagrama.nodes.each(nodo => {
				const alcanzado = nodosAlcanzados.includes(nodo.data.key) || nodo.data.key === claveNodoSeleccionado;
				m.set(nodo.data, "oscurecer", !alcanzado);
			});
		}, "Oscurecer nodos no adyacentes.");
	}

	// Determina el nivel/color de categoría de un nodo.
	function definirCategoria(nodo) {
		switch (nodo.data.categoria) {
			case "Primer Tramo": return 0;
			case "Segundo Tramo": return 1;
			case "Ciclo Profesional": return 2;
			case "Ciclo Profesional Orientado": return 3;
			default: return nodo.findTreeLevel();
		}
	}

	function cambiarColorNodo(nodo, coloresEntrada, descripcion = "Cambiar color de nodo") {
		if (!nodo || !nodo.data) return;
		const colores = (typeof coloresEntrada === "function") ? coloresEntrada() : coloresEntrada;
		instancia.model.commit(m => {
			m.set(nodo.data, "color_fondo", colores.fondo);
			m.set(nodo.data, "color_texto", colores.texto);
			m.set(nodo.data, "color_badge", colores.badge);
			m.set(nodo.data, "color_badge_borde", colores.badge_borde);
			m.set(nodo.data, "color_badge_texto", colores.badge_texto);
		}, descripcion);
	}

	function mostrarDetalleBorde(claveNodo, visible) {
		const nodo = instancia.findNodeForKey(claveNodo);
		if (!nodo) return;
		const forma = nodo.findObject("detalle_borde");
		if (forma) forma.visible = visible;
	}

	function cambiarTema() {
		if (instancia.themeManager.currentTheme === "dark") {
			instancia.themeManager.currentTheme = "light";
		} else {
			instancia.themeManager.currentTheme = "dark";
		}
		FCEGraph.datos.materiasAprobadas.forEach(clave => {
			const nodo = instancia.findNodeForKey(clave);
			if (nodo) cambiarColorNodo(nodo, FCEGraph.TEMA_NODO_DESTACADO);
		});
	}

	/* ---------- Creación de la instancia del diagrama ---------- */

	const instancia = $(go.Diagram, "myDiagramDiv", {
		initialContentAlignment: go.Spot.Center,
		"undoManager.isEnabled": true,
		"toolManager.mouseWheelBehavior": go.ToolManager.WheelZoom,
		"animationManager.isEnabled": true
	});

	/* Temas */
	instancia.themeManager.set('light', {
		colors: {
			background: '#fff',
			text: '#111827',
			textHighlight: '#11a8cd',
			subtext: '#6b7280',
			badge: '#e55c1840',
			badgeBorder: '#e55c18',
			badgeText: '#e55c18',
			divider: '#6b7280',
			shadow: '#9ca3af',
			tooltip: '#1f2937',
			dragOver: '#f0f9ff',
			link: '#9ca3af',
			div: '#f3f4f6',
			levels: [' #FF5733', 'rgb(195, 10, 56)', 'rgb(114, 12, 210)', ' #8d286f']
		},
		fonts: {
			name: '500 0.875rem Roboto, sans-serif',
			normal: '0.875rem Roboto, sans-serif',
			badge: '500 0.75rem Roboto, sans-serif',
			link: '600 0.875rem Roboto, sans-serif',
			text: 'bold 0.865rem Roboto, sans-serif'
		}
	});

	instancia.themeManager.set('dark', {
		colors: {
			background: '#111827',
			text: '#fff',
			subtext: '#d1d5db',
			badge: '#ef774420',
			badgeBorder: '#ef7744',
			badgeText: '#ef7744',
			shadow: '#111827',
			dragOver: '#082f49',
			link: '#6b7280',
			div: '#1f2937'
		}
	});

	instancia.themeManager.changesDivBackground = true;
	instancia.themeManager.currentTheme = "dark";

	/* Layout */
	instancia.layout = $(go.TreeLayout, {
		angle: 0,
		arrangement: go.TreeLayout.ArrangementFixedRoots,
		layerSpacing: 100,
		nodeSpacing: 30
	});

	/* Grupos */
	instancia.groupTemplate = $(go.Group, "Auto",
		{
			selectable: true,
			avoidable: true,
			layout: $(go.GridLayout, { wrappingColumn: 1 }),
			padding: 10
		},
		new go.Binding("layout", "wrapCol", col => $(go.GridLayout, { wrappingColumn: col })),
		$(go.Shape, "Rectangle", { fill: null, stroke: null }),
		$(go.Panel, "Vertical",
			$(go.TextBlock,
				{ font: "bold 12pt sans-serif", stroke: "#ffffff", margin: 4 },
				new go.Binding("text", "text")
			),
			$(go.Placeholder, { padding: 10 })
		)
	);

	/* Nodos */
	instancia.nodeTemplate = $(go.Node, "Spot",
		{
			dragComputation: evitarSuperposicion,
			isShadowed: true,
			shadowOffset: new go.Point(0, 2),
			selectionObjectName: 'BODY',
			mouseEnter: function (e, obj) {
				vistaPorDefecto();
				const nodoBajoElCursor = obj.part;
				if (nodoBajoElCursor instanceof go.Node) {
					destacarSeleccion(FCEGraph.datos.modeloCorrelativas, nodoBajoElCursor.data.key);
				}
			},
			mouseLeave: function () { vistaPorDefecto(); }
		},
		new go.Binding("opacity", "oscurecer", valor => valor ? 0.3 : 1),
		new go.Binding("position", "coordenadas", go.Point.parse).makeTwoWay(go.Point.stringify),

		$(go.Panel, "Auto", { name: 'BODY' },
			$(go.Shape, "RoundedRectangle", {
				name: 'SHAPE',
				strokeWidth: 0,
				portId: '',
				spot1: go.Spot.TopLeft,
				spot2: go.Spot.BottomRight
			}, new go.Binding("fill", "color_fondo").makeTwoWay()).theme('fill', 'background'),

			$(go.Panel, "Table", { margin: 5, defaultRowSeparatorStrokeWidth: 0.5 },
				$(go.Panel, "Table", { padding: new go.Margin(18, 18, 18, 24) })
					.addColumnDefinition(0, { width: 240 })
					.add(
						$(go.Panel, "Table", {
							column: 0, alignment: go.Spot.Left,
							stretch: go.Stretch.Vertical, defaultAlignment: go.Spot.Left
						})
						.add(
							$(go.Panel, "Horizontal", { row: 0 })
							.add(
								$(go.TextBlock, {
									maxSize: new go.Size(175, 60),
									wrap: go.TextBlock.WrapFit,
									margin: 2
								},
									new go.Binding("stroke", "color_texto").makeTwoWay()
								)
								.bindTwoWay('text', 'text')
								.theme('stroke', 'text')
								.theme('font', 'text'),

								$(go.Panel, "Auto", {
									alignment: go.Spot.Right,
									alignmentFocus: go.Spot.Left,
									margin: new go.Margin(0, 0, 0, 10)
								})
								.add(
									$(go.Shape, "Capsule", { parameter1: 6, parameter2: 6 },
										new go.Binding("fill", "color_badge").makeTwoWay(),
										new go.Binding("stroke", "color_badge_borde").makeTwoWay()
									)
									.theme('fill', 'badge')
									.theme('stroke', 'badgeBorder'),

									$(go.TextBlock, {
										minSize: new go.Size(10, 12),
										margin: new go.Margin(2, 5)
									},
										new go.Binding("stroke", "color_badge_texto").makeTwoWay()
									)
									.bindTwoWay('text', 'key')
									.theme('stroke', 'badgeText')
									.theme('font', 'badge')
								)
							)
						)
						.add(
							$(go.Panel, "Horizontal", { row: 2, alignment: go.Spot.Left },
								$(go.TextBlock, "Nota: ",
									new go.Binding("opacity", "mostrar_nota", valor => valor ? 1 : 0),
									new go.Binding("stroke", "color_texto").makeTwoWay()
								)
								.theme('stroke', 'text')
								.theme('font', 'normal'),

								$(go.TextBlock, {
									editable: false,
									minSize: new go.Size(10, 20),
									width: 30,
									isMultiline: false,
									textAlign: "left",
									margin: new go.Margin(5, 0, 0, 10)
								},
									new go.Binding("opacity", "mostrar_nota", valor => valor ? 1 : 0),
									new go.Binding("stroke", "color_texto").makeTwoWay(),
									new go.Binding("text", "nota")
								)
								.theme('stroke', 'text')
								.theme('font', 'normal')
							)
						)
					)
			)
		),

		// Detalle de color en el borde izquierdo (según categoría/nivel).
		$(go.Shape, "RoundedLeftRectangle", {
			name: "detalle_borde",
			visible: true,
			alignment: go.Spot.Left,
			alignmentFocus: go.Spot.Left,
			stretch: go.Stretch.Vertical,
			width: 7,
			strokeWidth: 0
		}).themeObject('fill', '', 'levels', definirCategoria)

	).theme('shadowColor', 'shadow');

	/* Enlaces */
	instancia.linkTemplate = $(go.Link,
		{ routing: go.Link.AvoidsNodes, corner: 7, curve: go.Link.Orthogonal, selectable: false },
		$(go.Shape, { strokeWidth: 1.5 }, new go.Binding("stroke", "color")),
		$(go.Shape, { toArrow: "Standard", scale: 0.7 },
			new go.Binding("stroke", "color"),
			new go.Binding("fill", "color")
		)
	);

	/* ---------- Ajuste responsive del diagrama ---------- */

	// Reencuadra el contenido del diagrama cada vez que cambia el tamaño
	// de la ventana (o de su contenedor), para que el grafo se achique o
	// agrande junto con la pantalla en tiempo real, sin esperar a que el
	// usuario termine de mover el mouse/ventana.
	let cuadroAnimacionPendiente = null;
	function reencuadrarDiagrama() {
		instancia.requestUpdate();
		instancia.zoomToFit();
		// Factor de "alejamiento" adicional: zoomToFit calza el grafo
		// justo dentro de los bordes del contenedor, así que reducimos
		// un poco más la escala para dejar aire alrededor y que no se
		// vea pegado a los bordes de la pantalla.
		instancia.scale = instancia.scale * 0.85;
		// En pantallas grandes evitamos que el diagrama se agrande de más
		// (no tiene sentido ir más allá del tamaño "natural" de los nodos).
		// En vista reducida (contenedor angosto/celular) sí dejamos que
		// zoomToFit achique todo lo necesario para que el grafo entre
		// completo, en vez de recortarlo con un límite fijo.
		if (instancia.scale > 0.85) instancia.scale = 0.85;
		instancia.alignDocument(go.Spot.Center, go.Spot.Center);
	}

	// En vez de esperar (debounce con setTimeout), usamos
	// requestAnimationFrame: coalescea varios eventos de resize que
	// ocurren en el mismo frame, pero el ajuste se aplica en el
	// siguiente frame disponible (prácticamente instantáneo), sin
	// ningún retraso artificial fijo.
	function programarReencuadre() {
		if (cuadroAnimacionPendiente !== null) return;
		cuadroAnimacionPendiente = requestAnimationFrame(() => {
			cuadroAnimacionPendiente = null;
			reencuadrarDiagrama();
		});
	}

	function inicializarAjusteResponsive() {
		window.addEventListener('resize', programarReencuadre);
		window.addEventListener('orientationchange', programarReencuadre);

		if (window.visualViewport) {
			window.visualViewport.addEventListener('resize', programarReencuadre);
		}

		const contenedor = document.getElementById('myDiagramDiv');
		if (window.ResizeObserver && contenedor) {
			const observador = new ResizeObserver(programarReencuadre);
			observador.observe(contenedor);
		}
	}

	inicializarAjusteResponsive();

	/* ---------- API pública ---------- */

	return {
		instancia,
		vistaPorDefecto,
		calcularMateriasDisponibles,
		destacarSeleccion,
		cambiarColorNodo,
		mostrarDetalleBorde,
		cambiarTema,
		reencuadrarDiagrama
	};
})();
