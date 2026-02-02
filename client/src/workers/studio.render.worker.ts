/// <reference lib="webworker" />

import { WebGLUtils } from '../utils/webgl/WebGLUtils';

let canvas: OffscreenCanvas | null = null;
let gl: WebGL2RenderingContext | WebGLRenderingContext | null = null;
let program: WebGLProgram | null = null;
let positionBuffer: WebGLBuffer | null = null;
let texCoordBuffer: WebGLBuffer | null = null;

// State
let activeScene: any = null;
const textureMap = new Map<string, WebGLTexture>();
const frameMap = new Map<string, VideoFrame>();
const streamReaders = new Map<string, ReadableStreamDefaultReader<VideoFrame>>();
const videoMetadata = new Map<string, { width: number, height: number }>();
const textureDirtyMap = new Map<string, boolean>();
let sceneDirty = true;


// Vertex Shader (Simple Pass-through with transform)
const vsSource300 = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
uniform vec2 u_translation;
uniform vec2 u_scale;
uniform vec2 u_texScale;
uniform vec2 u_texOffset;
out vec2 v_texCoord;
void main() {
    vec2 position = a_position * u_scale + u_translation;
    vec2 zeroToTwo = position * 2.0;
    vec2 clipSpace = zeroToTwo - 1.0;
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    v_texCoord = a_texCoord * u_texScale + u_texOffset;
}

`;

const fsSource300 = `#version 300 es
precision mediump float;
in vec2 v_texCoord;
uniform sampler2D u_image;
out vec4 outColor;
void main() {
    outColor = texture(u_image, v_texCoord);
}
`;

const vsSource100 = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
uniform vec2 u_translation;
uniform vec2 u_scale;
uniform vec2 u_texScale;
uniform vec2 u_texOffset;
varying vec2 v_texCoord;
void main() {
    vec2 position = a_position * u_scale + u_translation;
    vec2 zeroToTwo = position * 2.0;
    vec2 clipSpace = zeroToTwo - 1.0;
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    v_texCoord = a_texCoord * u_texScale + u_texOffset;
}

`;

const fsSource100 = `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_image;
void main() {
    gl_FragColor = texture2D(u_image, v_texCoord);
}
`;


// Uniform Locations
let uResolutionLoc: WebGLUniformLocation | null = null;
let uTranslationLoc: WebGLUniformLocation | null = null;
let uScaleLoc: WebGLUniformLocation | null = null;
let uTexScaleLoc: WebGLUniformLocation | null = null;
let uTexOffsetLoc: WebGLUniformLocation | null = null;
let uImageLoc: WebGLUniformLocation | null = null;


self.onmessage = async (e: MessageEvent) => {
    const { type, payload } = e.data;

    switch (type) {
        case 'init':
            canvas = payload.canvas;
            if (canvas) initGL();
            break;
        case 'resize':
            if (canvas) {
                canvas.width = payload.width;
                canvas.height = payload.height;
                if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
            }
            break;
        case 'add-stream':
            handleStream(payload.id, payload.stream);
            break;
        case 'remove-stream':
            // cleanup
            if (streamReaders.has(payload.id)) {
                streamReaders.get(payload.id)?.cancel();
                streamReaders.delete(payload.id);
            }
            if (frameMap.has(payload.id)) {
                frameMap.get(payload.id)?.close();
                frameMap.delete(payload.id);
            }
            if (textureMap.has(payload.id)) {
                gl.deleteTexture(textureMap.get(payload.id)!);
                textureMap.delete(payload.id);
            }
            textureDirtyMap.delete(payload.id);
            sceneDirty = true; // Redraw to remove the last frame of this stream
            break;
        case 'update-scene':
            activeScene = payload.scene;
            sceneDirty = true;
            break;
    }
};

function initGL() {
    if (!canvas) return;

    gl = canvas.getContext('webgl2', { alpha: false, desynchronized: true }) as WebGL2RenderingContext;
    if (!gl) {
        console.error("WebGL2 not supported in worker");
        gl = canvas.getContext('webgl', { alpha: false, desynchronized: true }) as WebGLRenderingContext;
        if (!gl) {
            console.error("WebGL not supported in worker");
            return;
        }
    }

    const isWebGL2 = gl instanceof WebGL2RenderingContext;
    const vs = WebGLUtils.createShader(gl, gl.VERTEX_SHADER, isWebGL2 ? vsSource300 : vsSource100);
    const fs = WebGLUtils.createShader(gl, gl.FRAGMENT_SHADER, isWebGL2 ? fsSource300 : fsSource100);


    if (!vs || !fs) return;

    program = WebGLUtils.createProgram(gl, vs, fs);
    if (!program) return;

    gl.useProgram(program);

    // Buffers using 0->1 unit quad
    const positions = [
        0, 0,
        1, 0,
        0, 1,
        1, 1,
    ];
    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const texCoords = [
        0, 0,
        1, 0,
        0, 1,
        1, 1,
    ];
    texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

    // Attributes
    const positionLoc = gl.getAttribLocation(program, "a_position");
    const texCoordLoc = gl.getAttribLocation(program, "a_texCoord");

    gl.enableVertexAttribArray(positionLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    gl.enableVertexAttribArray(texCoordLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniforms
    uResolutionLoc = gl.getUniformLocation(program, "u_resolution");
    uTranslationLoc = gl.getUniformLocation(program, "u_translation");
    uScaleLoc = gl.getUniformLocation(program, "u_scale");
    uTexScaleLoc = gl.getUniformLocation(program, "u_texScale");
    uTexOffsetLoc = gl.getUniformLocation(program, "u_texOffset");
    uImageLoc = gl.getUniformLocation(program, "u_image");


    requestAnimationFrame(renderLoop);
}

function handleStream(id: string, stream: ReadableStream<VideoFrame>) {
    const reader = stream.getReader();
    streamReaders.set(id, reader);

    const read = async () => {
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value) {
                    const oldFrame = frameMap.get(id);
                    if (oldFrame) oldFrame.close();
                    frameMap.set(id, value);
                    videoMetadata.set(id, { width: value.displayWidth, height: value.displayHeight });
                    textureDirtyMap.set(id, true);
                }
            }
        } catch (e) {
            console.error("Stream reader error:", e);
        } finally {
            streamReaders.delete(id);
        }
    };
    read();
}


function renderLoop() {
    if (!gl || !canvas || !program) return;

    // upload textures ONLY if dirty
    textureDirtyMap.forEach((dirty, id) => {
        if (!dirty) return;
        const frame = frameMap.get(id);
        if (!frame) return;

        if (!textureMap.has(id)) {
            const tex = WebGLUtils.createTexture(gl!);
            if (tex) textureMap.set(id, tex);
        }
        const tex = textureMap.get(id);
        if (tex) {
            gl!.bindTexture(gl!.TEXTURE_2D, tex);
            gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, frame);
            textureDirtyMap.set(id, false);
            sceneDirty = true; // Something changed, need to redraw scene
        }
    });

    if (!sceneDirty) {
        requestAnimationFrame(renderLoop);
        return;
    }

    // Draw
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.02, 0.02, 0.02, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (activeScene && activeScene.layout && activeScene.layout.regions) {
        activeScene.layout.regions.forEach((region: any) => {
            drawRegion(region);
        });
    }

    sceneDirty = false; // Scene is now up to date
    requestAnimationFrame(renderLoop);
}


function drawRegion(region: any) {
    if (!gl || !program) return;

    let id = '';
    if (region.source === 'host') id = 'host';
    else if (region.source.startsWith('guest')) id = region.source;

    const texture = id ? textureMap.get(id) : null;
    const meta = id ? videoMetadata.get(id) : null;

    if (texture && meta && canvas) {
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // Calculate Transform (Normalized 0->1)
        const x = region.x / 100;
        const y = region.y / 100;
        const w = region.width / 100;
        const h = region.height / 100;

        // "Object-Fit: Cover" Logic for Shaders
        const targetWidth = w * canvas.width;
        const targetHeight = h * canvas.height;
        const targetAspect = targetWidth / targetHeight;
        const sourceAspect = meta.width / meta.height;

        let texScaleX = 1.0;
        let texScaleY = 1.0;
        let texOffsetX = 0.0;
        let texOffsetY = 0.0;

        if (sourceAspect > targetAspect) {
            // Source is wider than target area (Crop Sides)
            texScaleX = targetAspect / sourceAspect;
            texOffsetX = (1.0 - texScaleX) / 2.0;
        } else if (sourceAspect < targetAspect) {
            // Source is taller than target area (Crop Top/Bottom)
            texScaleY = sourceAspect / targetAspect;
            texOffsetY = (1.0 - texScaleY) / 2.0;
        }

        gl.uniform2f(uTranslationLoc, x, y);
        gl.uniform2f(uScaleLoc, w, h);
        gl.uniform2f(uTexScaleLoc, texScaleX, texScaleY);
        gl.uniform2f(uTexOffsetLoc, texOffsetX, texOffsetY);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}

