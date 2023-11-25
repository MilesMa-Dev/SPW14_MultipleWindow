varying vec2 vUv;

uniform float time;
uniform sampler2D uPositions;
uniform vec4 resolution;

varying vec4 vColor;

void main() {
    gl_FragColor = vColor;
}