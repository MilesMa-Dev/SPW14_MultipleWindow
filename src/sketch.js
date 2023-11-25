import * as THREE from 'three'
import simVertex from './shaders/simVertex.glsl'
import simFragment from './shaders/simFragment.glsl'
import vertex from './shaders/vertex.glsl'
import fragment from './shaders/fragment.glsl'

export default class Sketch {
    constructor(options) {
        this.scene = options.scene;
        this.camera = options.camera;
        this.renderer = options.renderer;
        this.sizes = options.sizes;

        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();

        this.setupFBO();
        this.setModel();
        this.setEvents();
    }

    setEvents() {
        this.dummy = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshBasicMaterial());

        document.addEventListener('pointermove', (e) => {
            this.pointer.x = (e.clientX / this.sizes.width) * 2 - 1;
            this.pointer.y = -(e.clientY / this.sizes.height) * 2 + 1;

            this.raycaster.setFromCamera(this.pointer, this.camera);
            const intersects = this.raycaster.intersectObject(this.dummy);

            if (intersects.length > 0) {
                const { x, y } = intersects[0].point;
                this.fboMaterial.uniforms.uMouse.value = new THREE.Vector2(x, y);
            }
        })
    }

    setModel() {
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                uPositions: { value: null },
                resolution: { value: new THREE.Vector4() },
            },
            vertexShader: vertex,
            fragmentShader: fragment,
            side: THREE.DoubleSide,
            transparent: true,
            blending: THREE.AdditiveBlending,
        })

        this.count = this.size ** 2;

        let geometry = new THREE.BufferGeometry();
        let positions = new Float32Array(this.count * 3);
        let uvs = new Float32Array(this.count * 2);

        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                let index = (i + j * this.size);
                positions[index * 3 + 0] = Math.random();
                positions[index * 3 + 1] = Math.random();
                positions[index * 3 + 2] = 0;
                uvs[index * 2 + 0] = i / this.size;
                uvs[index * 2 + 1] = j / this.size;
            }
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

        this.material.uniforms.uPositions.value = this.fboTexture;
        this.points = new THREE.Points(geometry, this.material);
        this.scene.add(this.points);
    }

    getRenderTarget() {
        const renderTarget = new THREE.WebGLRenderTarget(this.sizes.width, this.sizes.height, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
        });

        return renderTarget;
    }

    setupFBO() {
        this.size = 512;
        this.fbo = this.getRenderTarget();
        this.fbo1 = this.getRenderTarget();

        this.fboScene = new THREE.Scene();
        this.fboCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
        this.fboCamera.position.set(0, 0, 0.);
        this.fboCamera.lookAt(0, 0, 0);

        let geometry = new THREE.PlaneBufferGeometry(2, 2);

        this.data = new Float32Array(this.size * this.size * 4);
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                let index = (i + j * this.size) * 4;
                let theta = Math.random() * Math.PI * 2;
                let r = 0.5 + Math.random() * 0.5;
                this.data[index + 0] = r * Math.cos(theta);
                this.data[index + 1] = r * Math.sin(theta);
                this.data[index + 2] = 1.0;
                this.data[index + 3] = 1.0;
            }
        }
        this.fboTexture = new THREE.DataTexture(this.data, this.size, this.size, THREE.RGBAFormat, THREE.FloatType);
        this.fboTexture.magFilter = THREE.NearestFilter;
        this.fboTexture.minFilter = THREE.NearestFilter;
        this.fboTexture.needsUpdate = true;

        this.fboMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uPositions: { value: this.fboTexture },
                uInfo: { value: null },
                uMouse: { value: new THREE.Vector2(0.5, 0.5) },
                time: { value: 0 },
            },
            vertexShader: simVertex,
            fragmentShader: simFragment,
        })

        this.infoArray = new Float32Array(this.size * this.size * 4);
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                let index = (i + j * this.size) * 4;
                this.infoArray[index + 0] = 0.5 + Math.random();
                this.infoArray[index + 1] = 0.5 + Math.random();
                this.infoArray[index + 2] = Math.random();
                this.infoArray[index + 3] = 1.0;
            }
        }
        this.info = new THREE.DataTexture(this.infoArray, this.size, this.size, THREE.RGBAFormat, THREE.FloatType);
        this.info.magFilter = THREE.NearestFilter;
        this.info.minFilter = THREE.NearestFilter;
        this.info.needsUpdate = true;
        this.fboMaterial.uniforms.uInfo.value = this.info;

        this.fboMesh = new THREE.Mesh(geometry, this.fboMaterial);
        this.fboScene.add(this.fboMesh);

        this.renderer.setRenderTarget(this.fbo);
        this.renderer.render(this.fboScene, this.fboCamera);
        this.renderer.setRenderTarget(this.fbo1);
        this.renderer.render(this.fboScene, this.fboCamera);
    }

    update(delta, elapsedTime) {
        this.material.uniforms.time.value = elapsedTime;
        this.fboMaterial.uniforms.time.value = elapsedTime;

        this.fboMaterial.uniforms.uPositions.value = this.fbo1.texture;
        this.material.uniforms.uPositions.value = this.fbo.texture;

        this.renderer.setRenderTarget(this.fbo);
        this.renderer.render(this.fboScene, this.fboCamera);
        this.renderer.setRenderTarget(null);
        this.renderer.render(this.scene, this.camera);

        // swap render targets
        let temp = this.fbo;
        this.fbo = this.fbo1;
        this.fbo1 = temp;
    }
}