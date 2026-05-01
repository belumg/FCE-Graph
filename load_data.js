
/* FUNCIONES AUXILIARES */

/* Vista */
// Ajusta el diagrama según escala.
async function get_escala(carrera) {
    try {
		const response = await fetch('src/layout.json?v=' + new Date().getTime());
		const data = await response.json();
		return data.escala?.[carrera];
	} catch (error) { 
		return console.error("Error!"); 
	}
}

// Simula el movimiento manual de nodos del diagrama.
function simular_movimiento_nodo(nodo_key, destino_x, destino_y) {
	const nodo = myDiagram.findNodeForKey(nodo_key);
	if (!nodo) return;

	const desde = nodo.location.copy();
	const hasta = new go.Point(destino_x, destino_y);
	const dx = (hasta.x - desde.x);
	const dy = (hasta.y - desde.y);
			
	myDiagram.startTransaction("Reacomodar nodo");
	const nueva_ubicacion = nodo.location.copy();
	nueva_ubicacion.x += dx;
	nueva_ubicacion.y += dy;
	nodo.location = nueva_ubicacion;
	myDiagram.model.setDataProperty(nodo.data, "coordenadas", go.Point.stringify(nueva_ubicacion));
	myDiagram.commitTransaction("Reacomodar nodo");
}

// Reacomoda nodos con padre.
async function reacomodar(carrera) {
    try {
		const response = await fetch('src/layout.json?v=' + new Date().getTime());
		const data = await response.json();
		const movimientos = data.movimientos?.[carrera];
			if (movimientos) {
				for (const [key, x, y] of movimientos) { simular_movimiento_nodo(key, x, y); }
			}
	} catch (error) { 
		return console.error("Error!"); 
	}
}

// Fija nodos sin padre.
async function fijar(carrera, nodos_diagrama) {
    try {
		const response = await fetch('src/layout.json?v=' + new Date().getTime());
		const data = await response.json();
		const coordenadas = data.coordenadas?.[carrera];
		if (coordenadas) {
			for (const [key, valor] of coordenadas) {
				const nodo = nodos_diagrama.find(n => n.key === key);
				if (nodo) { nodo.coordenadas = valor; }
			}
		}
	} catch (error) { 
		return console.error("Error!"); 
	}
}

// Calcula las coordenadas y ubica los nodos del 1er Tramo. 
function ubicar_1t(materias, nodos){
	let y = 0;
	materias.forEach(esta_materia => {
		const nodo = nodos.find(n => n.key === esta_materia);
		nodo.coordenadas = `0 ${y}`;
		y += 120;
	});		
}

// Grafica el diagrama.
function graficar_layout(nodos, links, raiz, carrera, materias_primer_tramo){
	ubicar_1t(materias_primer_tramo, nodos);
    fijar(carrera, nodos).then(async () => {
        myDiagram.model = new go.GraphLinksModel(nodos, links);
		
		const nueva_raiz = myDiagram.findNodeForKey(raiz);
		if (nueva_raiz) {
			myDiagram.layout.root = nueva_raiz;
			myDiagram.layoutDiagram(true);
		}
		
		const valor = await get_escala(carrera);
		reacomodar(carrera, nodos).then(() => { 
			myDiagram.scale = valor;
			myDiagram.alignDocument(go.Spot.Center, go.Spot.Center);
			//myDiagram.commandHandler.zoomToFit();
		});
    });
}


/* Lógica */
let estado = new Map();
let modelo_correlativas = [];
let materias_primer_tramo = [];
let materias_aprobadas = [];
let materias_disponibles = [];
let casos_particulares = [];
let nodos = [];
let links = [];

function buscar_casos_particulares(){
	//casos_particulares = []
	for (let clave in estado) {
		if (estado[clave][0] === "**"){
			if (!casos_particulares.includes(Number(clave))) { 
				casos_particulares.push(Number(clave)); 
			}
		}
	}
}

// Se asignan las correlativas del primer tramo según carrera.
function asignar_correlativas_1t(estado, modelo, materias_primer_tramo){
	for (let clave in estado) {
		if (estado[clave][0] === "*"){
			estado[clave] = materias_primer_tramo;
			materias_primer_tramo.forEach(m => {
				if (clave.charAt(0) === "#"){
					modelo_correlativas.push({ from: Number(m), to: clave });
				} else {
					modelo_correlativas.push({ from: Number(m), to: Number(clave) });
				}		
			});
		}
	}

	materias_primer_tramo.forEach(materia => {
		estado[materia] = [];
	});
}

// Se procesan las correlativas de una materia.
function procesar_correlativas(materia, lista_correlativas, estado, modelo, links){
	lista_correlativas.forEach(req_previo => {
		if (!estado[materia.codigo]) { 
			estado[materia.codigo] = []; 
		}
		if (req_previo != "*" && req_previo != "**") {
			modelo.push({ from: req_previo, to: materia.codigo });
			links.push({ from: req_previo, to: materia.codigo, color: "#6b7280" });
		}
		estado[materia.codigo].push(req_previo);
	});
}

// Limpia datos preexistentes.
function reset(){
	estado = {};
	modelo_correlativas = [];
	materias_primer_tramo = [];
	materias_aprobadas = [];
	materias_disponibles = [];
	casos_particulares = [];
	nodos = [];
	links = [];
	detener_confeti();
}


/* FUNCIÓN PRINCIPAL */
// Se carga el graph de una carrera y la lógica de funcionamiento.
function cargar_datos(carrera){
	fetch(`src/${carrera}.json?v=` + new Date().getTime())
		.then(response => response.json())
		.then(data => {
			reset();	
			//nodes.push({key: 1, isGroup: true, text: "Grupo Padre", wrapCol: 2})
			data.forEach(materia => {
				if (materia.caracter == "Obligatoria") {
					// Se registran las materias del 1er Tramo.
					if (materia.categoria === "Primer Tramo"){
						materias_primer_tramo.push(materia.codigo);
					}
					// Se guarda la materia leída como un nodo.
					nodos.push({ 
						key: materia.codigo, text: materia.materia, categoria: materia.categoria, 
						hs_semanales: materia.hs_semanales, depto: materia.departamento, mostrar_nota: false, 
						nota: "", coordenadas: ""});
					
					procesar_correlativas(materia, materia.correlativas, estado, modelo_correlativas, links);
				}
					/* <!-- if (materia.caracter === "Electiva (*)" || materia.caracter === "Optativa (**)"){ -->
						<!-- let ubi = ""; -->
						<!-- nodes.push({ key: materia.codigo, text: materia.materia, group: 1, categoria: materia.categoria, coordenadas: "3100 0"}); -->
					<!-- } --> */
			});
			asignar_correlativas_1t(estado, modelo_correlativas, materias_primer_tramo);
			buscar_casos_particulares();
			graficar_layout(nodos, links, 242, carrera, materias_primer_tramo);
		})
		.catch(error => console.error('Error cargando datos:', error));
}

document.getElementById('opciones').value = "LA";
cargar_datos("LA");


//cargar_datos(document.getElementById('opciones').value);