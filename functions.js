
/* APARIENCIA */
tema_nodo_destacado = {
	fondo: "#fa7942",
	texto: "#ffffff",
	badge: "#ffffff20",
	badge_borde: "#ffffff",
	badge_texto: "#ffffff"
}

tema_nodo_default = {
	fondo: myDiagram.themeManager.findValue("colors.background"),
	texto: myDiagram.themeManager.findValue("colors.text"),
	badge: myDiagram.themeManager.findValue("colors.badge"),
	badge_borde: myDiagram.themeManager.findValue("colors.badgeBorder"),
	badge_texto: myDiagram.themeManager.findValue("colors.badgeText")
}

function cambiar_color_nodo(nodo, colores_input, descripcion = "cambiar color de nodo") {
	if (!nodo || !nodo.data) return;
	const colores = (typeof colores_input === "function") ? colores_input() : colores_input;
	myDiagram.model.commit(m => {
		m.set(nodo.data, "color_fondo", colores.fondo);
		m.set(nodo.data, "color_texto", colores.texto);
		m.set(nodo.data, "color_badge", colores.badge);
		m.set(nodo.data, "color_badge_borde", colores.badge_borde);
		m.set(nodo.data, "color_badge_texto", colores.badge_texto);
	}, descripcion);
}

function mostrar_detalle_borde(nodo_key, valor){
	const node = myDiagram.findNodeForKey(nodo_key);
	const shape = node.findObject("detalle_borde");
	shape.visible = valor;
}


/* BOTONES */
// Cambiar tema del diagrama.
function cambiar_tema() {
	const myDiagram = go.Diagram.fromDiv('myDiagramDiv');
	if (myDiagram.themeManager.currentTheme == "dark") {
		myDiagram.themeManager.currentTheme = "light";
	} else {
		myDiagram.themeManager.currentTheme = "dark";
	}
	materias_aprobadas.forEach(key => {
	const nodo = myDiagram.findNodeForKey(key);
		if (nodo){ cambiar_color_nodo(nodo, tema_nodo_destacado);}
	});
}


/* BANNER SUPERIOR */
/* Menú de opciones */
document.getElementById('opciones').addEventListener('change', (event) => {
	const carrera = event.target.value;
	cargar_datos(carrera);

	const nro_registro = document.getElementById("registro").value;
	if (validar_registro(nro_registro)){
		if (carrera in sesion_usuario_actual){
			actualizar_graph_desde_JSON(sesion_usuario_actual[carrera]);
		}
	}else{
		document.getElementById("registro").value = "";
	}
});

async function actualizar_graph_desde_JSON(materias_aprobadas_y_nota) {
	await esperar_diagrama_cargado();
	materias_aprobadas_y_nota.forEach(dupla => {
		const codigo = dupla[0];
		const nota = dupla[1];
		const nodo = myDiagram.findNodeForKey(codigo);
		if (nodo) {
			actualizar_nota(nodo, nota, "agregar");
		}
	});
}

// Encuentra la carrera con mayor avance registrado por alumno
function encontrar_carrera_mayor_avance(data_carreras){
	let mayor_avance = 0;
	let carrera = "";
	
	// Hardcodeo:
	const cant_materias = {
		AC: 31,
		AD: 13,
		CP: 33,
		LA: 28,
		LE: 29,
		LS: 32
	}

	for (let clave in data_carreras) {
		let avance_actual = data_carreras[clave].length/cant_materias[clave];
		if (avance_actual > mayor_avance){
			mayor_avance = avance_actual;
			carrera = clave;
		}
	}
	return carrera;
}

// Recuperar la sesión del registo actual
let registro_actual;
let sesion_usuario_actual = {};
let aplazos;


document.getElementById('buscar').addEventListener('click', function() {

	const registro = document.getElementById('registro').value;
	
	fetch(`http://localhost:5000/alumnos/registro/${registro}`)
	.then(response => {
		if (!response.ok) {
			//throw new Error(`HTTP error: ${response.status}`);
			throw new Error(`No se encontró un alumno con este registro!`);
		}
		return response.json();
  	})
	.then(data => {
		registro_actual = data.registro;
		sesion_usuario_actual = data.carreras;
		aplazos = data.aplazos;

		const carrera = encontrar_carrera_mayor_avance(data.carreras);
		cargar_datos(carrera);

		document.getElementById('opciones').value = carrera;
		let lista_materias_notas = data.carreras[carrera];
		
		actualizar_graph_desde_JSON(lista_materias_notas);

		document.getElementById('aplazos').value = aplazos;
	})
	.catch(error => {
		console.error('Error en la solicitud:', error.message);
	});
});


function validar_registro(input_registro){
	const numero = Number(input_registro);
	if (numero < 100000 || numero > 2000000){ return false; }
	return Number.isInteger(numero);
}


// Guardar.
function encontrar_notas_materias(){

	let lista_materias_notas = [];
	materias_aprobadas.forEach(codigo => {
		const nodo = myDiagram.findNodeForKey(codigo);
		if (nodo) {
			const nota = nodo.data.nota;
			lista_materias_notas.push([codigo, Number(nota)]);
		}
	})
	return lista_materias_notas;
}

function generar_JSON() {
	const registro = document.getElementById("registro").value;
	const carrera = document.getElementById("opciones").value;
	const aplazos = document.getElementById("aplazos").value;
	if (!validar_aplazos(aplazos)) aplazos = "";

	if (!(carrera in sesion_usuario_actual))
		sesion_usuario_actual[carrera] = [];
	
	sesion_usuario_actual[carrera] = encontrar_notas_materias();

	const nueva_data = {
		registro: Number(registro),
		carreras: sesion_usuario_actual,
		aplazos: aplazos
	}

	return nueva_data;
}

function actualizar(nro_registro){
	fetch(`http://localhost:5000/alumnos/registro/${nro_registro}`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(generar_JSON())
	})
	.then(response => response.json())
	.then(data => { console.log('Respuesta del servidor:', data); })
	.catch(error => { console.error('Error al actualizar:', error); });
}

function guardar_nuevo(){
	fetch(`http://localhost:5000/alumnos`, {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
    	body: JSON.stringify(generar_JSON())
	})
}

document.getElementById("guardar").addEventListener("click", function(){
	const nro_registro = document.getElementById("registro").value;

	fetch(`http://localhost:5000/alumnos/registro/${nro_registro}`)
	.then(async response => {
		const data = await response.json();

		if (!response.ok) {
			// el backend mandó 404 con { error: "No encontrado" }
			guardar_nuevo();
			throw new Error(data.error || `Error HTTP ${response.status}`);
		}

		return data;
	})
	.then(data => {
		console.log("Alumno encontrado:", data);
		actualizar(nro_registro);
	})
	.catch(error => {
		console.error("Error en la solicitud:", error.message);
	});

});

// Borrar.
document.getElementById("eliminar").addEventListener("click", function (){
	if (document.getElementById("registro").value != ""){ //Cambiar esta condición a la de validar_registro.
		const nro_registro = document.getElementById("registro").value;

		fetch(`http://localhost:5000/alumnos/registro/${nro_registro}`, {method: 'DELETE'})
		.then(response => response.json())
		.then(data => {
			document.getElementById("registro").value = "";
			cargar_datos(document.getElementById("opciones").value);
			
		})
		.catch(error => console.error(error));
	}
});


/* Nota */
function fin_carrera(){
	if (materias_aprobadas.length === Object.keys(estado).length ){ return true; } 
	else { return false; }
}

function primer_tramo_completo(){
	let i = 0;
	materias_primer_tramo.forEach(materia =>{
		if (!materias_aprobadas.includes(materia)){ return false; }
		i++;
	})
	if (materias_primer_tramo.length === i){ return true; } else { return false; }
}

function calcular_materias_disponibles(estado){
	materias_disponibles = [];
	for (let clave in estado) {
		if (estado[clave][0] === undefined){
			if (clave.charAt(0) === "#"){
				if (!materias_disponibles.includes(clave)) { 
					materias_disponibles.push(clave); 
				}
			} else {
				if (!materias_disponibles.includes(Number(clave))) { 
					materias_disponibles.push(Number(clave)); 
				}
			}		
		}
	}
}

function verificar_casos_particulares(ctx){
	casos_particulares.forEach(codigo => {
		if (primer_tramo_completo() && materias_aprobadas.length >= 23){
			if (ctx = "agregar") estado[codigo] = [];
		} else {
			if (ctx = "quitar") estado[codigo] = ["**"];
		}
	})
}

function actualizar_estado(nodo_key, ctx){
	if (ctx === "agregar"){
		for (let clave in estado) {
			estado[clave] = estado[clave].filter(item => item != nodo_key);
		}
	}
	if (ctx === "quitar"){
		modelo_correlativas.forEach(enlace => {
			if (enlace.from === nodo_key){ estado[enlace.to].push(enlace.from); }	
		});
	}
	verificar_casos_particulares(ctx);
}

function actualizar_promedio(){
	let suma = 0;
	materias_aprobadas.forEach(key_materia =>{
		const nodo = myDiagram.findNodeForKey(key_materia);
		suma += Number(nodo.data.nota);
	})
	let promedio;
	let aplazos = document.getElementById("aplazos").value;
	if (suma === 0 || materias_aprobadas.length === 0){ promedio = "-"; } 
	else { promedio = ((suma + 2*Number(aplazos))/(materias_aprobadas.length + Number(aplazos))).toFixed(2); }
	document.getElementById("promedio").innerText = promedio;
}

function validar_aplazos(input_aplazos){ 
	let aplazos = Number(input_aplazos);
	
	if (Number.isInteger(aplazos) && aplazos >= 0){ 
		return true; 
	} else {
		return false;
	}
}

document.getElementById("aplazos").addEventListener("change", function(){
	if (validar_aplazos(document.getElementById("aplazos").value)){
		actualizar_promedio();
	} else {
		document.getElementById("aplazos").value = "";
	}
});


function aprobar_materia(nodo, input_nota){
	myDiagram.model.startTransaction("modificar nota");
	myDiagram.model.setDataProperty(nodo.data, "mostrar_nota", true);
	myDiagram.model.setDataProperty(nodo.data, "nota", input_nota);
	myDiagram.model.commitTransaction("modificar nota");
	cambiar_color_nodo(nodo, tema_nodo_destacado);
	mostrar_detalle_borde(nodo.data.key, false);
	if (!materias_aprobadas.includes(nodo.data.key)){
		materias_aprobadas.push(nodo.data.key);
	}
	toggle = true;
	if (fin_carrera()) lanzar_confeti();
}

function validar_nota(input_nota){ 
	const numero = Number(input_nota);
	if (numero < 4 || numero > 10){ return false; }
	return Number.isInteger(numero);
}

function remover_materia_aprobada(nodo, input=""){
	myDiagram.model.startTransaction("modificar nota");
	myDiagram.model.setDataProperty(nodo.data, "mostrar_nota", false);
	myDiagram.model.setDataProperty(nodo.data, "nota", input);
	myDiagram.model.commitTransaction("modificar nota");
	cambiar_color_nodo(nodo, tema_nodo_default);
	mostrar_detalle_borde(nodo.data.key, true);
	materias_aprobadas = materias_aprobadas.filter(item => item != nodo.data.key);
	toggle = false;
	detener_confeti();
}

function modificar_nota(nodo, input_nota){ 
	if (input_nota === ""){
		remover_materia_aprobada(nodo);
	} else {
		if (validar_nota(input_nota)){
			aprobar_materia(nodo, input_nota);
		} else {
			document.getElementById("nota").value = "";
			document.getElementById("nota").focus();
		}
	}
}

function actualizar_nota(nodo, valor_actualizar, ctx){
	modificar_nota(nodo, valor_actualizar);
	actualizar_promedio();
	actualizar_estado(nodo.data.key, ctx);
	vista_diagrama_default();
}

document.getElementById("nota").addEventListener("keydown", function(event) {
	if (event.key === "Enter") {
		actualizar_nota(myDiagram.selection.first(), document.getElementById("nota").value, "agregar");
	}
});

document.getElementById("ok").addEventListener("click", function() {
	actualizar_nota(myDiagram.selection.first(), document.getElementById("nota").value, "agregar");
});
	
document.getElementById("not-ok").addEventListener("click", function() {
	actualizar_nota(myDiagram.selection.first(), "", "quitar");
	document.getElementById("nota").value = "";
	document.getElementById("nota").focus();
});


/* EVENTOS */
let toggle = false;
myDiagram.addDiagramListener("ObjectDoubleClicked", function(e)  {
	mostrar_elementos_clase("acciones", "flex");
	document.getElementById("nota").focus();
	const nodo_clickeado = e.subject.part;
	if (nodo_clickeado instanceof go.Node) {
		myDiagram.model.commit(m => {
			if (toggle === false){
				document.getElementById("nota").value = 4;
				actualizar_nota(nodo_clickeado, document.getElementById("nota").value, "agregar");
			} else {
				document.getElementById("nota").value = "";
				actualizar_nota(nodo_clickeado, document.getElementById("nota").value, "quitar");
			}
		}, "cambiar color de nodo");
	}
});

// Encuentra todos los elementos de una clase y los muestra.
function mostrar_elementos_clase(nombre_clase, tipo_display){
	let elementos = document.getElementsByClassName(nombre_clase);
	for (let i = 0; i < elementos.length; i++) {
		elementos[i].style.display = tipo_display;
	}
}

// Se resetea el banner superior.
myDiagram.addDiagramListener("BackgroundSingleClicked", function(e) {
	document.getElementById("contenedor-izquierda").style.display = "block";
	document.getElementById("detalles").style.display = "none";
});

// Aparece el detalle del nodo seleccionado en el banner.
myDiagram.addDiagramListener("ObjectSingleClicked", function(e) {
	document.getElementById("contenedor-izquierda").style.display = "none";
	const nodo_clickeado = e.subject.part;
	if (nodo_clickeado.data.nota != "") { mostrar_elementos_clase("acciones", "flex"); } 
	else { mostrar_elementos_clase("acciones", "none"); }
	document.getElementById("detalles").style.display = "block";
    document.getElementById("materia").innerText = nodo_clickeado.data.text;		
	document.getElementById("materia").style.fontWeight = "bold";
    document.getElementById("hs_semanales").innerText = nodo_clickeado.data.hs_semanales;
    document.getElementById("departamento").innerText = nodo_clickeado.data.depto;
	document.getElementById("nota").value = nodo_clickeado.data.nota;
	document.getElementById("nota").focus();
});

function esperar_diagrama_cargado() {
	return new Promise(resolve => {
		if (myDiagram.isInitialLayoutCompleted) {
			resolve();
		} else {
		// Listener específico solo para la promesa
			function listener(e) {
				myDiagram.removeDiagramListener("InitialLayoutCompleted", listener);
				resolve();
			}
			myDiagram.addDiagramListener("InitialLayoutCompleted", listener);
		}
	});
}

// Se muestra la vista por default cuando el diagrama se carga completamente.
myDiagram.addDiagramListener("InitialLayoutCompleted", vista_diagrama_default);

