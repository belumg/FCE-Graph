
  /************************/
 /* FUNCIONES AUXILIARES */
/************************/

// Evita que los nodos se encimen unos con otros.
function evitar_superposicion(part, nueva_ubicacion) {
	const diagram = part.diagram;
	const bordes_actuales_nodo = part.actualBounds;
	const nuevos_bordes = bordes_actuales_nodo.copy();
	nuevos_bordes.position = nueva_ubicacion;

	let colisionan = false;
	diagram.nodes.each(function(other) {
		if (other === part) return;
		if (nuevos_bordes.intersectsRect(other.actualBounds)) {
			colisionan = true;
		}
	});
		
	return colisionan ? part.location : nueva_ubicacion;
}

// Vuelve a la vista por defecto del diagrama.
function vista_diagrama_default() {		
	myDiagram.model.commit(m => {
		// Enlaces:
		m.linkDataArray.forEach(enlace => {
			m.set(enlace, "color", "#6b7280");
		});
		
		// Nodos:
		// myDiagram.nodes.each(function(nodo) {
		// 	m.set(nodo.data, "oscurecer", false);
		// });

	}, "Enlaces por defecto.");
	
	calcular_materias_disponibles(estado);

	myDiagram.model.commit(function(m) {
		myDiagram.nodes.each(function(este_nodo) {		
			if (materias_disponibles.includes(este_nodo.data.key)){
				m.set(este_nodo.data, "oscurecer", false);
			} else {
				m.set(este_nodo.data, "oscurecer", true);
			}
				
		});
	}, "Oscurecer los nodos no adyacentes al seleccionado.");
	
	//myDiagram.layoutDiagram(true);
}

// Destaca la selección al dejar el cursor sobre un nodo.
function destacar_seleccion(modelo_correlativas, nodo_seleccionado) {
	let nodos_alcanzados = [];
	myDiagram.startTransaction("Destacar enlaces.");
	modelo_correlativas.forEach(enlace => {
		if (enlace.from === nodo_seleccionado || enlace.to === nodo_seleccionado){
			const enlace_real = myDiagram.model.linkDataArray.find(l =>
				l.from === enlace.from && l.to === enlace.to
			);
			if (enlace_real) { myDiagram.model.setDataProperty(enlace_real, "color", "#ef4444"); }
			if (!nodos_alcanzados.includes(enlace.from)) { nodos_alcanzados.push(enlace.from); }
			if (!nodos_alcanzados.includes(enlace.to)) { nodos_alcanzados.push(enlace.to); }
		}
	});
	myDiagram.commitTransaction("Destacar enlaces.");

	// Nodos:
	myDiagram.model.commit(function(m) {
		myDiagram.nodes.each(function(este_nodo) {		
			if (nodos_alcanzados.includes(este_nodo.data.key) 
				|| este_nodo.data.key == nodo_seleccionado){
				m.set(este_nodo.data, "oscurecer", false);
			}else{
				m.set(este_nodo.data, "oscurecer", true);
			}
				
		});
	}, "Oscurecer los nodos no adyacentes al seleccionado.");
		
}

// Define el detalle de color de cada nodo.
function definir_categoria(nodo) {
	switch (nodo.data.categoria) {
		case "Primer Tramo":
			return 0;
		case "Segundo Tramo":
			return 1;
		case "Ciclo Profesional":
			return 2;
		case "Ciclo Profesional Orientado":
			return 3;
		default:
			return nodo.findTreeLevel();
	}
}



  /******************************/
 /* CONFIGURACIÓN DEL DIAGRAMA */
/******************************/

const $ = go.GraphObject.make;
const myDiagram = $(go.Diagram, "myDiagramDiv", {
	initialContentAlignment: go.Spot.Center,
	"undoManager.isEnabled": true,
	"toolManager.mouseWheelBehavior": go.ToolManager.WheelZoom
});
	
/* Temas */
myDiagram.themeManager.set('light', {
	colors: {
		background: '#fff',
		text: '#111827',
		textHighlight: '#11a8cd',
		subtext: '#6b7280',
		badge: '#e55c1840',
		badgeBorder: '#e55c18', //'#16a34a33',
		badgeText: '#e55c18', //'#15803d',
		divider: '#6b7280',
		shadow: '#9ca3af',
		tooltip: '#1f2937',
		dragOver: '#082f49',
		link: '#6b7280',
		div: '#1f2937',
		levels: [
			' #FF5733',
			'rgb(195, 10, 56)',
			'rgb(114, 12, 210)',
			' #8d286f'
		],
		//levels: ['#AC193D', '#2672EC', '#8C0095', '#5133AB', '#008299', '#D24726', '#008A00', '#094AB2'],
		dragOver: '#f0f9ff',
		link: '#9ca3af',
		div: '#f3f4f6'
	},
	fonts: {
		name: '500 0.875rem Roboto, sans-serif',
		normal: '0.875rem Roboto, sans-serif',
		badge: '500 0.75rem Roboto, sans-serif',
		link: '600 0.875rem Roboto, sans-serif',
		text: 'bold 0.865rem Roboto, sans-serif'
	}
});

myDiagram.themeManager.set('dark', {
	colors: {
		background: '#111827',
		text: '#fff',
		subtext: '#d1d5db',
		badge: '#ef774420',
		badgeBorder: '#ef7744', //'#22c55e21',
		badgeText: '#ef7744', //'#4ade80',
		shadow: '#111827',
		dragOver: '#082f49',
		link: '#6b7280',
		div: '#1f2937'
	}
});

myDiagram.themeManager.changesDivBackground = true; // Cambia el color del div junto con el de fondo. 
myDiagram.themeManager.currentTheme = "dark"; // Tema oscuro al incio por defecto. 
	

/* Layout */
myDiagram.layout = $(go.TreeLayout, {
	angle: 0,
	arrangement: go.TreeLayout.ArrangementFixedRoots,
	layerSpacing: 100, // Ajuste entre columnas.
	nodeSpacing: 30  // Ajuste entre filas.
});


/* Grupos */
myDiagram.groupTemplate = $(go.Group, "Auto",
	{
		selectable: true,
		avoidable: true,
		layout: $(go.GridLayout, { wrappingColumn: 1 }),
		padding: 10
	},
	new go.Binding("layout", "wrapCol", function(col) {
		return $(go.GridLayout, { wrappingColumn: col });
	}),
	$(go.Shape, "Rectangle", { fill: null, stroke: null }),
	$(
	go.Panel, 
	"Vertical",
	$(
		go.TextBlock,
		{ font: "bold 12pt sans-serif", stroke: "#ffffff", margin: 4 },
		new go.Binding("text", "text")
	),
	$(go.Placeholder, { padding: 10 })
	)
);


/* Nodos */
myDiagram.nodeTemplate = $(go.Node, "Spot",
	{
		dragComputation: evitar_superposicion,
		isShadowed: true,
		shadowOffset: new go.Point(0, 2),
		selectionObjectName: 'BODY',
		mouseEnter: function(e, obj) {
			vista_diagrama_default();
			var mouse_sobre_nodo = obj.part;
			if (mouse_sobre_nodo instanceof go.Node) {
				destacar_seleccion(modelo_correlativas, mouse_sobre_nodo.data.key);
			}
		},
		mouseLeave: function(e, obj) { vista_diagrama_default(); }
	},
	new go.Binding("opacity", "oscurecer", function(valor) { return valor ? 0.3 : 1; }),
	new go.Binding("position", "coordenadas", go.Point.parse).makeTwoWay(go.Point.stringify),

	$(go.Panel, "Auto", { name: 'BODY' },
		$(go.Shape, "RoundedRectangle", {
			name: 'SHAPE',
			strokeWidth: 0,
			portId: '',
			spot1: go.Spot.TopLeft,
			spot2: go.Spot.BottomRight
		}, new go.Binding("fill", "color_fondo").makeTwoWay()).theme('fill', 'background'),

		$(go.Panel, "Table", {
			margin: 5,
			defaultRowSeparatorStrokeWidth: 0.5
		},
			$(go.Panel, "Table", {
				padding: new go.Margin(18, 18, 18, 24)
			})
			.addColumnDefinition(0, { width: 240 })
			.add(
				$(go.Panel, "Table", {
					column: 0,
					alignment: go.Spot.Left,
					stretch: go.Stretch.Vertical,
					defaultAlignment: go.Spot.Left
				})
				.add(
					$(go.Panel, "Horizontal", { row: 0 })
					.add(
						$(go.TextBlock, {
							maxSize: new go.Size(175, 60),
							wrap: go.TextBlock.WrapFit,
							margin: 2
						},
  						new go.Binding("stroke", "color_texto").makeTwoWay(),
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
  							new go.Binding("stroke", "color_badge_borde").makeTwoWay(),
							)
							.theme('fill', 'badge')
							.theme('stroke', 'badgeBorder'),

							$(go.TextBlock, {
								minSize: new go.Size(10, 12),
								margin: new go.Margin(2, 5)
							},
							new go.Binding("stroke", "color_badge_texto").makeTwoWay(),
							)
							.bindTwoWay('text', 'key')
							.theme('stroke', 'badgeText')
							.theme('font', 'badge')
						)
					)
				)
				.add(
					$(go.Panel, "Horizontal", {
						row: 2,
						alignment: go.Spot.Left
					},
						$(go.TextBlock,
							"Nota: ",
							new go.Binding("opacity", "mostrar_nota", function(valor) { return valor ? 1 : 0; }),
							new go.Binding("stroke", "color_texto").makeTwoWay(),
						)
						.theme('stroke', 'text')
						.theme('font', 'normal'),

						$(go.TextBlock, {
							editable: false,
							minSize: new go.Size(10, 20),
							width: 30,
							isMultiline: false,
							textAlign: "left",
							margin: new go.Margin(5, 0, 0, 10),
							},
							new go.Binding("opacity", "mostrar_nota", function(valor) { return valor ? 1 : 0; }),
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
	
	// Detalle de color en el borde.
	$(go.Shape, "RoundedLeftRectangle", {
		name: "detalle_borde",
		visible: true,
		alignment: go.Spot.Left,
		alignmentFocus: go.Spot.Left,
		stretch: go.Stretch.Vertical,
		width: 7,
		strokeWidth: 0
	}).themeObject('fill', '', 'levels', definir_categoria)

).theme('shadowColor', 'shadow');

/* Enlaces */	
myDiagram.linkTemplate = $(
	go.Link,
	{ routing: go.Link.AvoidsNodes, corner: 7, curve: go.Link.Orthogonal, selectable: false },
	$(go.Shape,
		{ strokeWidth: 1.5 },
		new go.Binding("stroke", "color") // Color de la línea.
	),
	$(go.Shape,
		{ toArrow: "Standard", scale: 0.7 },
		new go.Binding("stroke", "color"), // Borde de la flecha.
		new go.Binding("fill", "color") // Relleno de la flecha.
	)
);
