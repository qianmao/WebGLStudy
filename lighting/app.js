var gl;

var InitDemo = function() {
	loadTextResource('./shader.vs.glsl', function(vsErr, vsText) {
		if (vsErr) {
			alert('Fatal error getting vertex shader (see console)');
			console.error(vsErr);
		} else {
			loadTextResource('./shader.fs.glsl', function(fsErr, fsText) {
				if (fsErr) {
					alert('Fatal error getting fragment shader (see console)');
					console.error(fsErr);
				} else {
					loadJSONResource('./model.json', function(modelErr, modelObj) {
						if (modelErr) {
							alert('Fatal error getting model (see console)');
							console.error(modelErr);
						} else {
							loadImage('./modelTexture.png', function(imgErr, img) {
								if (imgErr) {
									alert('Fatal error getting model texture (see console)');
									console.error(imgErr);
								} else {
									RunDemo(vsText, fsText, img, modelObj);	
								}
							})
						}
					});
				}
			});
		}
	});
};

var RunDemo = function(vertexShaderText, fragmentShaderText, image, model) {
	console.log('This is working');

	var canvas = document.getElementById('game-surface');
	gl = canvas.getContext('webgl');

	if (!gl) {
		console.log('WebGL not supported, falling back on experimental-webgl')
		gl = canvas.getContext('experimental-webgl');
	}

	if (!gl) {
		alert('Your browser does not support WebGL');
	}

	//canvas.width = window.innerWidth;
	//canvas.height = window.innerHeight;
	//gl.viewPoint(0, 0, window,innerWidth, window.innerHeight);

	gl.clearColor(0.75, 0.85, 0.8, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	gl.frontFace(gl.CCW);
	gl.cullFace(gl.BACK);

	// create shaders
	var vertexShader = gl.createShader(gl.VERTEX_SHADER);
	var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

	gl.shaderSource(vertexShader, vertexShaderText);
	gl.shaderSource(fragmentShader, fragmentShaderText);

	gl.compileShader(vertexShader);
	if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
		console.error('Error compiling vertext shader!', gl.getShaderInfoLog(vertexShader));
	}
	gl.compileShader(fragmentShader);
	if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
		console.error('Error compiling fragment shader!', gl.getShaderInfoLog(fragmentShader));
	}

	var program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.error('Error linking program!', gl.getProgramInfoLog(program));
		return;
	}

	gl.validateProgram(program);
	if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
		console.error('Error validating program!', gl.getProgramInfoLog(program));
		return;
	}

	// setup done, ready to take vertices now
	// create buffer
	var modelVertices = model.meshes[0].vertices;
	var modelIndices =  [].concat.apply([], model.meshes[0].faces);
	var modelTexCoords = model.meshes[0].texturecoords[0];
	var modelNormals = model.meshes[0].normals;

	var modelPosVertexBufferObject = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, modelPosVertexBufferObject);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(modelVertices), gl.STATIC_DRAW);	
	// static draw means send data from CPU mem to GPU mem and won't change

	var modelTexCoordVertexBufferObject = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, modelTexCoordVertexBufferObject);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(modelTexCoords), gl.STATIC_DRAW);

	var modelIndexBufferObject = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, modelIndexBufferObject);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(modelIndices), gl.STATIC_DRAW);

	var modelNormalBufferObject = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, modelNormalBufferObject);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(modelNormals), gl.STATIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, modelPosVertexBufferObject);
	var positionAttribLocation = gl.getAttribLocation(program, 'vertPosition');
	gl.vertexAttribPointer(
		positionAttribLocation, // attribute location)
		3, // number of elements per attribute
		gl.FLOAT, // type of elements
		gl.FALSE,
		3 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
		0 // offset from the beginning of a single vertex to this attribute
	);
	gl.enableVertexAttribArray(positionAttribLocation);

	gl.bindBuffer(gl.ARRAY_BUFFER, modelTexCoordVertexBufferObject);
	var texCoordAttribLocation = gl.getAttribLocation(program, 'vertTexCoord');
	gl.vertexAttribPointer(
		texCoordAttribLocation, // attribute location)
		2, // number of elements per attribute
		gl.FLOAT, // type of elements
		gl.FALSE,
		2 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
		0
	);

	gl.enableVertexAttribArray(texCoordAttribLocation);

	gl.bindBuffer(gl.ARRAY_BUFFER, modelNormalBufferObject);
	var normalAttribLocation = gl.getAttribLocation(program, 'vertNormal');
	gl.vertexAttribPointer(
		normalAttribLocation,
		3, gl.FLOAT,
		gl.TRUE,
		3 * Float32Array.BYTES_PER_ELEMENT,
		0
	);
	gl.enableVertexAttribArray(normalAttribLocation);

	//
	// Create texture
	//
	var modelTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, modelTexture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

	gl.texImage2D(
		gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
		gl.UNSIGNED_BYTE,
		image
	);

	gl.bindTexture(gl.TEXTURE_2D, null);

	// Tell WebGL state machine which program should be active.
	gl.useProgram(program);

	var matWorldUniformLocation = gl.getUniformLocation(program, 'mWorld');
	var matViewUniformLocation = gl.getUniformLocation(program, 'mView');
	var matProjUniformLocation = gl.getUniformLocation(program, 'mProj');

	var worldMatrix = new Float32Array(16);
	var viewMatrix = new Float32Array(16);
	var projMatrix = new Float32Array(16);
	mat4.identity(worldMatrix);
	mat4.lookAt(viewMatrix, [0, 0, -5], [0, 0, 0], [0, 1, 0]);
	mat4.perspective(projMatrix, glMatrix.toRadian(60), canvas.width / canvas.height, 0.1, 1000.0);

	gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
	gl.uniformMatrix4fv(matViewUniformLocation, gl.FALSE, viewMatrix);
	gl.uniformMatrix4fv(matProjUniformLocation, gl.FALSE, projMatrix);

	var xRotationMatrix = new Float32Array(16);
	var yRotationMatrix = new Float32Array(16);

	// lighting information
	gl.useProgram(program);

	var ambientUniformLocation = gl.getUniformLocation(program, 'ambientLightIntensity');
	var sunlightDirUniformLocation = gl.getUniformLocation(program, 'sun.direction');
	var sunlightIntUniformLocation = gl.getUniformLocation(program, 'sun.color');

	gl.uniform3f(ambientUniformLocation, 0.2, 0.2, 0.2);
	gl.uniform3f(sunlightDirUniformLocation, 3.0, 4.0, -2.0);
	gl.uniform3f(sunlightIntUniformLocation, 0.9, 0.9, 0.9);

	//
	// main render loop
	//
	var identityMatrix = new Float32Array(16);
	mat4.identity(identityMatrix);
	var angle = 0;
	var loop = function() {
		angle = performance.now() / 1000 / 6 * 2 * Math.PI;	// performance.now return mills after window created
		mat4.rotate(yRotationMatrix, identityMatrix, angle, [0, 1, 0]);
		mat4.rotate(xRotationMatrix, identityMatrix, angle / 3, [1, 0, 0]);
		mat4.mul(worldMatrix, yRotationMatrix, xRotationMatrix);
		gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);

		gl.clearColor(0.75, 0.85, 0.8, 1.0);
		gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

		gl.bindTexture(gl.TEXTURE_2D, modelTexture);
		gl.activeTexture(gl.TEXTURE0);

		gl.drawElements(gl.TRIANGLES, modelIndices.length, gl.UNSIGNED_SHORT, 0);

		requestAnimationFrame(loop);
	};

	requestAnimationFrame(loop);

};
