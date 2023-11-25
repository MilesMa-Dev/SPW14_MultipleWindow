uniform float time;
uniform sampler2D uPositions;

varying vec2 vUv;
varying vec4 vColor;

void main() {
    vUv = uv;

    vec4 pos = texture2D(uPositions, uv);

    float angle = atan(pos.y, pos.x);
    vColor = vec4(0.5 + 0.45 * sin(angle + time * 0.8)) * 0.9;

    vec4 mvPosition = modelViewMatrix * vec4(pos.xyz, 1.0);
    gl_PointSize = 2.0 * (1. / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
}