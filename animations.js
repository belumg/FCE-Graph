(() => {
	// Referencia al contenedor donde va el confeti
	const contenedor = document.getElementById('myDiagramDiv');

	// Crear canvas y agregarlo al contenedor
	const canvas = document.createElement('canvas');
	canvas.style.position = 'absolute';
	canvas.style.top = '0';
	canvas.style.left = '0';
	canvas.style.pointerEvents = 'none';
	contenedor.appendChild(canvas);
	const ctx = canvas.getContext('2d');

	// Variables para tamaño y partículas
	let width, height;
	const colors = ["#FF0000", "#FF4500", "#CC5500", "#FF7518", "#FFA500", "#F4A460", "#FFD580"];
	const maxParticles = 150;
	const particles = [];

	function resize() {
		const rect = contenedor.getBoundingClientRect();
		width = rect.width;
		height = rect.height;
		canvas.width = width;
		canvas.height = height;
		canvas.style.width = width + 'px';
		canvas.style.height = height + 'px';
	}

	window.addEventListener('resize', resize);
	resize();

	function crearParticula() {
		return {
		x: Math.random() * width,
		y: Math.random() * height - height,
		r: Math.random() * 6 + 4,
		d: Math.random() * maxParticles,
		color: colors[Math.floor(Math.random() * colors.length)],
		tilt: Math.random() * 10 - 5,
		tiltAngle: 0,
		tiltAngleIncrement: Math.random() * 0.07 + 0.05,
		speedY: Math.random() * 3 + 2,
		};
	}

	for(let i = 0; i < maxParticles; i++) {
		particles.push(crearParticula());
	}

	let animationId;
	let running = false;

	function draw() {
		ctx.clearRect(0, 0, width, height);
		particles.forEach(p => {
		ctx.beginPath();
		ctx.lineWidth = p.r / 2;
		ctx.strokeStyle = p.color;
		ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
		ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
		ctx.stroke();
		});
	}

	function update() {
		particles.forEach(p => {
		p.tiltAngle += p.tiltAngleIncrement;
		p.y += p.speedY;
		p.x += Math.sin(p.tiltAngle) * 0.5;
		p.tilt = Math.sin(p.tiltAngle) * 15;

		if(p.y > height) {
			p.x = Math.random() * width;
			p.y = -10;
			p.tilt = Math.random() * 10 - 5;
			p.tiltAngle = 0;
			p.speedY = Math.random() * 3 + 2;
		}
		});
	}

	function animar() {
		draw();
		update();
		animationId = requestAnimationFrame(animar);
	}

	window.lanzar_confeti = function() {
		if (!running) {
		resize();
		running = true;
		animar();
		}
	};

	window.detener_confeti = function() {
		if (running) {
		running = false;
		cancelAnimationFrame(animationId);
		ctx.clearRect(0, 0, width, height);
		}
	};
})();