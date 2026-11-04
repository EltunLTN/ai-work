import * as T from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { RabbitState } from "./white-rabbit";

/** Original, procedural 3D character. No downloaded models, textures or film assets. */
export function mountRabbitScene(canvas: HTMLCanvasElement, getState: () => RabbitState, isReduced: () => boolean) {
  const webglContext = canvas.getContext("webgl2", { alpha:true, antialias:true, powerPreference:"low-power" });
  if (!webglContext || !webglContext.getShaderPrecisionFormat(webglContext.VERTEX_SHADER, webglContext.HIGH_FLOAT) || !webglContext.getShaderPrecisionFormat(webglContext.FRAGMENT_SHADER, webglContext.HIGH_FLOAT)) throw new Error("WebGL2 unavailable");
  const renderer = new T.WebGLRenderer({ canvas, context: webglContext, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  const scene = new T.Scene();
  const environment = new RoomEnvironment();
  const pmrem = new T.PMREMGenerator(renderer);
  const env = pmrem.fromScene(environment, .04);
  scene.environment = env.texture;
  environment.dispose(); pmrem.dispose();
  const camera = new T.PerspectiveCamera(32, 1, .1, 100);
  camera.position.set(0, 1.75, 7.6); camera.lookAt(0, 1.65, 0);
  scene.add(new T.HemisphereLight(0xfff6e3, 0x7e8da4, 2.6));
  const key = new T.DirectionalLight(0xffefd8, 4.5); key.position.set(-3, 5, 4); scene.add(key);
  const rim = new T.DirectionalLight(0xa8caff, 3); rim.position.set(3, 3, -2); scene.add(rim);
  const fur = new T.MeshStandardMaterial({ color: 0xf6f1e8, roughness: .86 });
  const pink = new T.MeshStandardMaterial({ color: 0xd5a4a1, roughness: .85 });
  const dark = new T.MeshStandardMaterial({ color: 0x202c28, roughness: .65 });
  const satin = new T.MeshStandardMaterial({ color: 0x993f43, roughness: .35 });
  const eye = new T.MeshPhysicalMaterial({ color: 0x151b19, roughness: .08, clearcoat: 1 });
  const gold = new T.MeshStandardMaterial({ color: 0xc6a85d, metalness: .92, roughness: .25 });
  const ivory = new T.MeshStandardMaterial({ color: 0xfff4da, roughness: .55 });
  const white = new T.MeshBasicMaterial({ color: 0xffffff });
  const materials = [fur, pink, dark, satin, eye, gold, ivory, white];
  const geometries: T.BufferGeometry[] = [];
  const body = new T.Group(); scene.add(body);
  function sphere(parent: T.Object3D, material: T.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) {
    const geometry = new T.SphereGeometry(1, 28, 20); geometries.push(geometry);
    const mesh = new T.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); parent.add(mesh); return mesh;
  }
  const torso = sphere(body, dark, 0, .95, 0, .58, .76, .42);
  sphere(body, fur, 0, .6, -.12, .6, .55, .43);
  sphere(body, fur, -.56, .57, -.23, .24, .24, .24);
  const feet = [-1, 1].map(side => sphere(body, fur, side * .37, .15, .22, .3, .18, .43));
  const arms = [-1, 1].map(side => { const g = new T.Group(); g.position.set(side * .48, 1.28, 0); body.add(g); const arm = sphere(g, fur, side * .09, -.28, .15, .18, .42, .2); arm.rotation.z = side * .25; sphere(g, fur, side * .08, -.56, .28, .19, .2, .19); return g; });
  // Waistcoat piping, three buttons and bow tie.
  for (const y of [.72, .96, 1.18]) sphere(body, gold, 0, y, .424, .035, .035, .02);
  const bow = new T.Group(); bow.position.set(0, 1.57, .4); body.add(bow);
  [-1, 1].forEach(side => { const b = sphere(bow, satin, side * .115, 0, 0, .13, .085, .055); b.rotation.z = side * .35; }); sphere(bow, satin, 0, 0, .02, .06, .07, .06);
  const head = new T.Group(); head.position.set(0, 1.98, .05); body.add(head);
  sphere(head, fur, 0, 0, 0, .63, .61, .5);
  const ears = [-1, 1].map(side => {
    const g = new T.Group(); g.position.set(side * .3, .45, -.05); g.rotation.z = -side * .14; head.add(g);
    sphere(g, fur, 0, .55, 0, .18, .7, .16); sphere(g, pink, 0, .58, .112, .105, .53, .052); return g;
  });
  // Soft crown tufts and cheek volumes keep the same silhouette in every scene.
  for (const side of [-1,0,1]) { const tuft=sphere(head,fur,side*.12,.51,.04,.15,.18,.17);tuft.rotation.z=side*.25; }
  const eyes = [-1, 1].map(side => { const g = new T.Group(); g.position.set(side * .255, .06, .43); head.add(g); sphere(g, eye, 0, 0, 0, .096, .125, .065); sphere(g, white, -.025, .039, .057, .023, .028, .01); return g; });
  sphere(head, fur, -.15, -.22, .43, .23, .18, .15); sphere(head, fur, .15, -.22, .43, .23, .18, .15);
  sphere(head, pink, 0, -.14, .574, .09, .06, .052);
  const lineMaterial = new T.LineBasicMaterial({ color: 0x8c8a7d, transparent: true, opacity: .62 }); materials.push(lineMaterial as unknown as T.MeshStandardMaterial);
  [-1, 1].forEach(side => {
    for (let i = 0; i < 3; i++) {
      const geometry = new T.BufferGeometry().setFromPoints([new T.Vector3(side * .2, -.2, .56), new T.Vector3(side * .79, -.17 + (i - 1) * .09, .5)]); geometries.push(geometry); head.add(new T.Line(geometry, lineMaterial));
    }
  });
  const watch = new T.Group(); watch.position.set(.53, .77, .58); watch.rotation.set(.1, -.15, -.15); body.add(watch);
  const caseGeometry = new T.CylinderGeometry(.31, .31, .085, 48); caseGeometry.rotateX(Math.PI / 2); geometries.push(caseGeometry);
  watch.add(new T.Mesh(caseGeometry, gold));
  const faceGeometry = new T.CircleGeometry(.265, 48); geometries.push(faceGeometry); const face = new T.Mesh(faceGeometry, ivory); face.position.z = .05; watch.add(face);
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; const marker = sphere(watch, dark, Math.sin(a) * .225, Math.cos(a) * .225, .058, .009, .018, .006); marker.rotation.z = -a; }
  const hands = new T.Group(); hands.position.z = .068; watch.add(hands);
  const handGeometry = new T.BoxGeometry(.014, .16, .01); geometries.push(handGeometry); const hand = new T.Mesh(handGeometry, dark); hand.position.y = .07; hands.add(hand);
  const shortHand = new T.Mesh(handGeometry, dark); shortHand.scale.y = .6; shortHand.rotation.z = -2; shortHand.position.set(.045, -.02, 0); hands.add(shortHand);
  sphere(watch, gold, 0, .35, 0, .05, .06, .04);
  const chainCurve = new T.CatmullRomCurve3([new T.Vector3(0, 1.2, .45), new T.Vector3(.2, .92, .51), new T.Vector3(.48, 1.1, .6)]);
  const chainGeometry = new T.TubeGeometry(chainCurve, 16, .012, 5, false); geometries.push(chainGeometry); body.add(new T.Mesh(chainGeometry, gold));
  const monocleGeometry = new T.TorusGeometry(.155, .012, 7, 40); geometries.push(monocleGeometry); const monocle = new T.Mesh(monocleGeometry, gold); monocle.position.set(.255, .06, .515); head.add(monocle);
  const shadowCanvas = document.createElement("canvas"); shadowCanvas.width = shadowCanvas.height = 128;
  const context = shadowCanvas.getContext("2d")!; const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64); gradient.addColorStop(0, "rgba(20,30,20,.3)"); gradient.addColorStop(1, "rgba(20,30,20,0)"); context.fillStyle = gradient; context.fillRect(0, 0, 128, 128);
  const shadowTexture = new T.CanvasTexture(shadowCanvas);
  const shadowGeometry = new T.PlaneGeometry(2.3, 1.4); geometries.push(shadowGeometry); const shadowMaterial = new T.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false });
  const shadow = new T.Mesh(shadowGeometry, shadowMaterial); shadow.rotation.x = -Math.PI / 2; shadow.position.y = -.035; scene.add(shadow);
  let visible = true, disposed = false, last = 0, lastPointer = 0, staticFrames = 0;
  let previousState: RabbitState | null = null;
  let stride=0;
  const pointer = new T.Vector2();
  const onPointer = (e: PointerEvent) => { if (performance.now() - lastPointer < 80) return; lastPointer = performance.now(); pointer.set((e.clientX / innerWidth - .5) * .5, (e.clientY / innerHeight - .5) * .12); };
  const resize = () => { const { width, height } = canvas.getBoundingClientRect(); if (!width || !height) return; renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); render(performance.now()); };
  function render(now: number) {
    if (disposed || document.hidden || !visible || now - last < 33) return;
    last = now; const t = now / 1000; const reduced = isReduced(); const state = getState();
    if (reduced && state === previousState && staticFrames > 4) return;
    staticFrames = reduced && state === previousState ? staticFrames + 1 : 0; previousState = state;
    const running = state === "running" || state === "hop";
    stride=T.MathUtils.lerp(stride,running?1:0,.12);
    body.position.y = reduced ? 0 : stride * Math.abs(Math.sin(t * 11)) * .16 + (1-stride) * Math.sin(t * 1.7) * .018;
    body.rotation.y = T.MathUtils.lerp(body.rotation.y, -.2 + (reduced ? 0 : pointer.x), .055);
    head.rotation.z = T.MathUtils.lerp(head.rotation.z,reduced ? 0 : state === "curiosity" ? .17 : Math.sin(t * .8) * .025,.08);
    head.rotation.x = reduced ? 0 : pointer.y;
    torso.scale.y = .76 + (reduced ? 0 : Math.sin(t * 1.7) * .01);
    ears.forEach((ear, i) => { ear.rotation.z = (i ? -.14 : .14) + (reduced ? 0 : Math.sin(t * (running ? 10 : 1.4) + i) * (running ? .15 : .035)); });
    const blink = !reduced && t % 5.7 < .14 ? .12 : 1; eyes.forEach(e => e.scale.y = blink);
    arms.forEach((arm, i) => arm.rotation.x = reduced ? 0 : running ? Math.sin(t * 11 + i * Math.PI) * .4 : Math.sin(t * 1.3 + i) * .045);
    feet.forEach((foot, i) => foot.rotation.x = reduced ? 0 : running ? Math.sin(t * 11 + i * Math.PI) * .18 : 0);
    watch.rotation.z = -.15 + (reduced ? 0 : Math.sin(t * 1.5) * .025); hands.rotation.z = state === "curiosity" && !reduced ? -t : -.4;
    renderer.render(scene, camera);
  }
  const observer = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? true; }); observer.observe(canvas);
  const size = new ResizeObserver(resize); size.observe(canvas);
  window.addEventListener("pointermove", onPointer, { passive: true });
  renderer.setAnimationLoop(render); resize();
  return () => {
    disposed = true; renderer.setAnimationLoop(null); observer.disconnect(); size.disconnect(); window.removeEventListener("pointermove", onPointer);
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); shadowMaterial.dispose(); shadowTexture.dispose(); env.dispose(); renderer.dispose(); renderer.forceContextLoss();
  };
}
