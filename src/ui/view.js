import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
export class View {
  constructor(element) {
    this.element = element;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#101823");
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.01, 1000);
    this.camera.position.set(2, 1.4, 3.8);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    element.append(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 1, 0);
    this.controls.enableDamping = false;
    this.scene.add(new THREE.HemisphereLight(0xd4e7ff, 0x65564d, 2.4));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(3, 5, 4);
    this.scene.add(light);
    const fill = new THREE.DirectionalLight(0x789bff, 1);
    fill.position.set(-3, 2, -2);
    this.scene.add(fill);
    const grid = new THREE.GridHelper(6, 24, 0x364458, 0x202d3e);
    this.scene.add(grid);
    this.holder = new THREE.Group();
    this.scene.add(this.holder);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(element);
    this.resize();
  }
  resize() {
    const w = this.element.clientWidth,
      h = this.element.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.render();
  }
  clearModel() {
    this.clearHelper();
    this.holder.clear();
    this.root = null;
    this.render();
  }
  setModel(root, reference) {
    this.holder.clear();
    this.clearHelper();
    this.root = root;
    const size = reference.getSize(new THREE.Vector3()),
      center = reference.getCenter(new THREE.Vector3()),
      scale = 2 / Math.max(size.y, size.x * 0.5, 0.001);
    this.holder.scale.setScalar(scale);
    this.holder.position.set(
      -center.x * scale,
      -reference.min.y * scale,
      -center.z * scale,
    );
    this.holder.add(root);
    if (this.skeletonEnabled) this.setSkeleton(true);
    this.render();
  }
  clearHelper() {
    if (!this.helper) return;
    this.helper.removeFromParent();
    if (typeof this.helper.dispose === "function") this.helper.dispose();
    else {
      this.helper.geometry.dispose();
      this.helper.material.dispose();
    }
    this.helper = null;
  }
  setSkeleton(on) {
    this.skeletonEnabled = on;
    this.clearHelper();
    if (on && this.root) {
      if (this.root.userData.boneSegments) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(this.root.userData.boneSegments, 3),
        );
        this.helper = new THREE.LineSegments(
          geometry,
          new THREE.LineBasicMaterial({ color: 0x5bd6b5, depthTest: false }),
        );
        this.helper.renderOrder = 100;
        this.holder.add(this.helper);
      } else {
        this.scene.updateMatrixWorld(true);
        this.helper = new THREE.SkeletonHelper(this.root);
        this.scene.add(this.helper);
      }
    }
    this.render();
  }
  sync(other) {
    this.camera.position.copy(other.camera.position);
    this.camera.quaternion.copy(other.camera.quaternion);
    this.controls.target.copy(other.controls.target);
    this.controls.update();
    this.render();
  }
  reset(angle = 0) {
    this.camera.position.set(
      Math.sin(angle) * 4.4,
      1.25,
      Math.cos(angle) * 4.4,
    );
    this.controls.target.set(0, 1, 0);
    this.controls.update();
    this.render();
  }
  render() {
    this.renderer.render(this.scene, this.camera);
  }
  shot() {
    this.render();
    return this.renderer.domElement.toDataURL("image/png");
  }
}
