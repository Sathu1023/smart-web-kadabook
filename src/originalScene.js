import * as THREE from "three";
import { createSceneRuntime } from "./sceneRuntime.js";
import { ICON_PATHS } from "./icons.js";
import { computeStoryLayout } from "./storyLayout.js";
import {
  defaultStoryScreens,
  defaultScreenLabels,
  featureIcons,
  getStoryDemo,
  previewReelKeys,
  storyPanels,
} from "./storyDemos.js";

// Original scroll story with realistic hardware, selectable real screenshots,
// and layered icon/content reveals matching the React fallback.
export function startOriginalScene(root, IMG) {
  const runtime = createSceneRuntime(root);
  const {
    document,
    listen,
    observe,
    keepScene,
    keepRenderer,
    addEventListener,
    requestAnimationFrame,
    setTimeout,
    clearTimeout,
  } = runtime;
  document
    .querySelectorAll(".after h2,.after .lead,.final .pill")
    .forEach((e) => e.classList.add("rv"));
  const io = observe(
    (es) =>
      es.forEach((e) => {
        e.target.classList.toggle("motion-visible", e.isIntersecting);
        if (e.isIntersecting) e.target.classList.add("in");
      }),
    { threshold: 0.2 },
  );
  document.querySelectorAll(".rv").forEach((el) => io.observe(el));
  async function initialize() {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const L = await runtime.loadImages(IMG);
    if (runtime.disposed) return;
    try {
      await Promise.race([
        Promise.all([
          document.fonts.load("700 40px 'Sora'"),
          document.fonts.load("600 44px 'Sora'"),
          document.fonts.load("700 38px 'Outfit'"),
          document.fonts.load("600 30px 'Outfit'"),
          document.fonts.load("500 12px 'Outfit'"),
          document.fonts.load("400 17px 'Manrope'"),
          document.fonts.load("500 14px 'Manrope'"),
          document.fonts.load("600 15px 'Manrope'"),
        ]),
        new Promise((r) => setTimeout(r, 2500)),
      ]);
    } catch (e) {}
    if (runtime.disposed) return;

    let renderer;
    try {
      renderer = keepRenderer(
        new THREE.WebGLRenderer({
          canvas: document.getElementById("gl"),
          antialias: true,
        }),
      );
    } catch (e) {
      runtime.fallback(e);
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x030a18, 1);
    renderer.localClippingEnabled = true;
    const reflectionClip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const aniso = renderer.capabilities.getMaxAnisotropy();

    const scene = keepScene(new THREE.Scene());
    scene.fog = new THREE.FogExp2(0x030a18, 0.045);
    const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    scene.add(new THREE.AmbientLight(0xd4dae3, 0.62));
    const dl = new THREE.DirectionalLight(0xffffff, 1.05);
    dl.position.set(3, 5, 4);
    scene.add(dl);
    const pl1 = new THREE.PointLight(0xd5e4ff, 0.58, 14);
    pl1.position.set(-3, 1, 3);
    scene.add(pl1);
    const pl2 = new THREE.PointLight(0x7197cf, 0.4, 14);
    pl2.position.set(3, -1, 3);
    scene.add(pl2);
    const pl3 = new THREE.PointLight(0xe8edf5, 0.75, 12);
    pl3.position.set(0, 1, -4);
    scene.add(pl3);

    function rr(c, x, y, w, h, r) {
      c.beginPath();
      c.moveTo(x + r, y);
      c.arcTo(x + w, y, x + w, y + h, r);
      c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r);
      c.arcTo(x, y, x + w, y, r);
      c.closePath();
    }
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v)),
      lerp = (a, b, t) => a + (b - a) * t,
      sm = (t) => t * t * (3 - 2 * t);
    function tex(cv) {
      const t = new THREE.CanvasTexture(cv);
      t.anisotropy = aniso;
      return t;
    }

    /* brand text */
    function brandTex(flip) {
      const c = document.createElement("canvas");
      c.width = 2048;
      c.height = 512;
      const g = c.getContext("2d");
      g.font = "700 330px 'Sora',sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.shadowColor = "rgba(79,209,255,.9)";
      g.shadowBlur = 50;
      const gr = g.createLinearGradient(0, 90, 0, 430);
      gr.addColorStop(0, "#fff");
      gr.addColorStop(0.45, "#cfe0ff");
      gr.addColorStop(0.55, "#8fa9d6");
      gr.addColorStop(1, "#e8f1ff");
      g.fillStyle = gr;
      g.fillText("KadaBook", 1024, 262);
      g.shadowBlur = 0;
      g.lineWidth = 3;
      g.strokeStyle = "rgba(255,255,255,.55)";
      g.strokeText("KadaBook", 1024, 262);
      if (!flip) return tex(c);
      const f = document.createElement("canvas");
      f.width = 2048;
      f.height = 512;
      const h = f.getContext("2d");
      h.translate(0, 512);
      h.scale(1, -1);
      h.drawImage(c, 0, 0);
      h.setTransform(1, 0, 0, 1, 0, 0);
      h.globalCompositeOperation = "destination-in";
      const m = h.createLinearGradient(0, 0, 0, 512);
      m.addColorStop(0, "rgba(0,0,0,.55)");
      m.addColorStop(0.6, "rgba(0,0,0,0)");
      h.fillStyle = m;
      h.fillRect(0, 0, 2048, 512);
      return tex(f);
    }
    const brandFrac = (() => {
      const x = document.createElement("canvas").getContext("2d");
      x.font = "700 330px 'Sora',sans-serif";
      return Math.min(0.95, x.measureText("KadaBook").width / 2048);
    })();
    const brandMat = new THREE.MeshBasicMaterial({
      map: brandTex(false),
      transparent: true,
      depthWrite: false,
    });
    const brand = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), brandMat);
    scene.add(brand);
    const brandRefMat = new THREE.MeshBasicMaterial({
      map: brandTex(true),
      transparent: true,
      depthWrite: false,
    });
    const brandRef = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), brandRefMat);
    scene.add(brandRef);

    /* phone screen = real screenshots */
    const SW = 480,
      SH = 1020;
    const selectedDemos = defaultStoryScreens.map(() => null);
    const demoScreenKeys = [...defaultStoryScreens];
    const demoScreenLabels = [...defaultScreenLabels];
    const activeDemoLabels = defaultStoryScreens.map(() => null);
    const sc = document.createElement("canvas");
    sc.width = SW;
    sc.height = SH;
    const c = sc.getContext("2d");
    const screenTex = tex(sc);
    let demoRevision = 0,
      paintedScreen = "",
      activeDemoScene = 0;
    function screenKey(i) {
      return demoScreenKeys[i];
    }
    function drawScreen(i) {
      const im = L[screenKey(i)];
      c.clearRect(0, 0, SW, SH);
      c.save();
      rr(c, 0, 0, SW, SH, 54);
      c.clip();
      c.fillStyle = im ? "#f5f7fc" : "#0b1930";
      c.fillRect(0, 0, SW, SH);
      if (im && im.width) {
        // Fit the whole supplied screen, including Tamil labels and bottom actions.
        const s = Math.min(SW / im.width, SH / im.height),
          w = im.width * s,
          h = im.height * s;
        c.drawImage(im, (SW - w) / 2, (SH - h) / 2, w, h);
      } else {
        c.drawImage(L.logo, SW / 2 - 48, SH / 2 - 130, 96, 96);
        c.textAlign = "center";
        c.fillStyle = "#e6f3ff";
        c.font = "600 27px 'Outfit'";
        c.fillText("Expenses", SW / 2, SH / 2 + 15);
        c.fillStyle = "#a8bdd8";
        c.font = "400 19px 'Manrope'";
        c.fillText("Tamil screenshot not supplied", SW / 2, SH / 2 + 55);
      }
      c.restore();
      screenTex.needsUpdate = true;
    }
    function paintAppFrame(g, im) {
      g.clearRect(0, 0, SW, SH);
      g.save();
      rr(g, 0, 0, SW, SH, 54);
      g.clip();
      g.fillStyle = im ? "#f5f7fc" : "#0b1930";
      g.fillRect(0, 0, SW, SH);
      if (im && im.width) {
        const s = Math.min(SW / im.width, SH / im.height),
          w = im.width * s,
          h = im.height * s;
        g.drawImage(im, (SW - w) / 2, (SH - h) / 2, w, h);
      }
      g.restore();
    }
    function paintReel(g, time) {
      const keys = previewReelKeys.filter((key) => L[key]?.width);
      if (!keys.length) {
        paintAppFrame(g, L.dash);
        return;
      }
      const hold = 2.2;
      const fade = reduce ? 0 : 0.4;
      const cycle = keys.length * hold;
      const t = reduce ? 0 : time % cycle;
      const i = Math.floor(t / hold) % keys.length;
      const local = t - Math.floor(t / hold) * hold;
      paintAppFrame(g, L[keys[i]]);
      if (fade && local > hold - fade) {
        const next = L[keys[(i + 1) % keys.length]];
        if (next?.width) {
          g.save();
          g.globalAlpha = (local - (hold - fade)) / fade;
          const s = Math.min(SW / next.width, SH / next.height),
            w = next.width * s,
            h = next.height * s;
          rr(g, 0, 0, SW, SH, 54);
          g.clip();
          g.drawImage(next, (SW - w) / 2, (SH - h) / 2, w, h);
          g.restore();
        }
      }
    }

    /* phone back texture with logo */
    const bc = document.createElement("canvas");
    bc.width = 480;
    bc.height = 1000;
    {
      const g = bc.getContext("2d");
      g.save();
      rr(g, 0, 0, 480, 1000, 60);
      g.clip();
      const gr = g.createLinearGradient(0, 0, 480, 1000);
      gr.addColorStop(0, "#30343b");
      gr.addColorStop(0.45, "#1e232a");
      gr.addColorStop(1, "#11161c");
      g.fillStyle = gr;
      g.fillRect(0, 0, 480, 1000);
      const st = g.createLinearGradient(0, 0, 480, 1000);
      st.addColorStop(0, "rgba(255,255,255,.07)");
      st.addColorStop(0.35, "rgba(255,255,255,0)");
      st.addColorStop(1, "rgba(255,255,255,.015)");
      g.fillStyle = st;
      g.fillRect(0, 0, 480, 1000);
      for (let row = 0; row < 1000; row += 3) {
        g.fillStyle = row % 2 ? "rgba(255,255,255,.015)" : "rgba(0,0,0,.02)";
        g.fillRect(0, row, 480, 1);
      }
      if (L.logo && L.logo.width) {
        g.save();
        g.filter = "grayscale(1)";
        g.globalAlpha = 0.3;
        g.drawImage(L.logo, 198, 565, 84, 84);
        g.restore();
      }
      g.font = "600 20px 'Sora',sans-serif";
      g.fillStyle = "rgba(185,193,204,.48)";
      g.textAlign = "center";
      g.fillText("KadaBook", 240, 700);
      g.restore();
    }
    const backTex = tex(bc);

    /* phone model */
    const PW = 0.95,
      PH = 1.95;
    function rrShape(w, h, r) {
      const s = new THREE.Shape(),
        x = -w / 2,
        y = -h / 2;
      s.moveTo(x + r, y);
      s.lineTo(x + w - r, y);
      s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r);
      s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h);
      s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r);
      s.quadraticCurveTo(x, y, x + r, y);
      return s;
    }
    const ext = (w, h, r, d, b) =>
      new THREE.ExtrudeGeometry(rrShape(w, h, r), {
        depth: d,
        bevelEnabled: true,
        bevelSize: b,
        bevelThickness: b,
        bevelSegments: 3,
        curveSegments: 12,
      });
    const bodyGeo = ext(PW, PH, 0.15, 0.08, 0.02);
    bodyGeo.translate(0, 0, -0.04);
    const bezelGeo = new THREE.ShapeGeometry(
      rrShape(PW - 0.016, PH - 0.016, 0.135),
      12,
    );
    const screenGeo = new THREE.PlaneGeometry(PW - 0.06, PH - 0.06),
      backGeo = new THREE.PlaneGeometry(PW - 0.01, PH - 0.01);
    const rimGeo = ext(0.46, 0.46, 0.12, 0.016, 0.004),
      plateGeo = ext(0.43, 0.43, 0.105, 0.04, 0.006);
    const barrelGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.03, 36),
      bezelRing = new THREE.TorusGeometry(0.077, 0.007, 12, 40),
      innerRing = new THREE.TorusGeometry(0.061, 0.005, 8, 32),
      glassGeo = new THREE.CircleGeometry(0.058, 32),
      flashGeo = new THREE.CircleGeometry(0.026, 20),
      flashRing = new THREE.TorusGeometry(0.03, 0.006, 8, 20);
    const btnA = new THREE.BoxGeometry(0.015, 0.19, 0.034),
      btnB = new THREE.BoxGeometry(0.015, 0.12, 0.034),
      holeGeo = new THREE.CircleGeometry(0.013, 24),
      earpieceGeo = new THREE.ShapeGeometry(rrShape(0.11, 0.009, 0.004)),
      portGeo = new THREE.BoxGeometry(0.1, 0.009, 0.026),
      speakerGeo = new THREE.BoxGeometry(0.009, 0.008, 0.02);
    const frameShape = rrShape(PW - 0.008, PH - 0.008, 0.145);
    frameShape.holes.push(rrShape(PW - 0.027, PH - 0.027, 0.133));
    const frameGeo = new THREE.ShapeGeometry(frameShape, 20);
    const lensTex = (() => {
      const q = document.createElement("canvas");
      q.width = q.height = 128;
      const g = q.getContext("2d");
      const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      r.addColorStop(0, "#04060f");
      r.addColorStop(0.3, "#0b1a52");
      r.addColorStop(0.55, "#2b1f70");
      r.addColorStop(0.8, "#0a1433");
      r.addColorStop(1, "#02040b");
      g.fillStyle = r;
      g.fillRect(0, 0, 128, 128);
      g.strokeStyle = "rgba(130,170,255,.35)";
      g.lineWidth = 2;
      [18, 32, 46].forEach((v) => {
        g.beginPath();
        g.arc(64, 64, v, 0, 7);
        g.stroke();
      });
      g.strokeStyle = "rgba(255,255,255,.55)";
      g.lineWidth = 5;
      g.lineCap = "round";
      g.beginPath();
      g.arc(64, 64, 40, 3.5, 4.5);
      g.stroke();
      g.fillStyle = "rgba(120,220,255,.8)";
      g.beginPath();
      g.arc(84, 82, 5, 0, 7);
      g.fill();
      return new THREE.CanvasTexture(q);
    })();
    // Keep the entire camera island comfortably inside the rounded back shell.
    const IX = 0.15,
      IY = 0.62;
    const hardwareFinish = {
      color: 0x353b44,
      specular: 0x8d949f,
      shininess: 42,
    };
    function makePhone(op, screenMap) {
      const g = new THREE.Group();
      const P = (o) => {
        const m = new THREE.MeshPhongMaterial(o);
        if (op) {
          m.transparent = true;
          m.opacity = op;
          m.side = THREE.DoubleSide;
          m.depthWrite = false;
          m.clippingPlanes = [reflectionClip];
        }
        return m;
      };
      const B = (o) => {
        const m = new THREE.MeshBasicMaterial(o);
        if (op) {
          m.transparent = true;
          m.opacity = op;
          m.side = THREE.DoubleSide;
          m.depthWrite = false;
          m.clippingPlanes = [reflectionClip];
        }
        return m;
      };
      const add = (geo, mat, x, y, z, rx, ry) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        if (rx) m.rotation.x = rx;
        if (ry) m.rotation.y = ry;
        g.add(m);
        return m;
      };
      add(bodyGeo, P(hardwareFinish), 0, 0, 0);
      add(btnA, P(hardwareFinish), PW / 2 + 0.003, 0.25, 0);
      add(btnB, P(hardwareFinish), -PW / 2 - 0.003, 0.4, 0);
      add(btnB, P(hardwareFinish), -PW / 2 - 0.003, 0.19, 0);
      add(bezelGeo, B({ color: 0x050607 }), 0, 0, 0.0615);
      add(
        frameGeo,
        P({ color: 0x767d86, specular: 0x9ba2ad, shininess: 65 }),
        0,
        0,
        0.062,
      );
      add(
        screenGeo,
        B({ map: screenMap || screenTex, transparent: true }),
        0,
        0,
        0.0635,
      );
      add(holeGeo, B({ color: 0x000000 }), 0, PH / 2 - 0.072, 0.0655);
      add(earpieceGeo, B({ color: 0x080a0d }), 0, PH / 2 - 0.021, 0.063);
      add(portGeo, B({ color: 0x080a0d }), 0, -PH / 2 - 0.008, 0);
      for (const x of [-0.22, -0.19, -0.16, 0.16, 0.19, 0.22])
        add(speakerGeo, B({ color: 0x0a0c0f }), x, -PH / 2 - 0.008, 0);
      add(
        backGeo,
        P({
          map: backTex,
          transparent: true,
          alphaTest: 0.1,
          specular: 0x41454c,
          shininess: 26,
        }),
        0,
        0,
        -0.0615,
        0,
        Math.PI,
      );
      add(
        rimGeo,
        P({ color: 0x60656e, specular: 0xa0a4ae, shininess: 62 }),
        IX,
        IY,
        -0.0615,
        0,
        Math.PI,
      );
      add(
        plateGeo,
        P({ color: 0x14171d, specular: 0x616874, shininess: 55 }),
        IX,
        IY,
        -0.074,
        0,
        Math.PI,
      );
      [
        [-0.09, 0.09],
        [-0.09, -0.09],
        [0.1, 0.09],
      ].forEach((p) => {
        const x = IX + p[0],
          y = IY + p[1];
        add(
          barrelGeo,
          P({ color: 0x202a40, specular: 0xffffff, shininess: 150 }),
          x,
          y,
          -0.126,
          Math.PI / 2,
        );
        add(
          bezelRing,
          P({ color: 0x626a77, specular: 0xb0b7c1, shininess: 75 }),
          x,
          y,
          -0.141,
        );
        add(
          innerRing,
          P({ color: 0x0a0f1d, specular: 0x5577cc, shininess: 80 }),
          x,
          y,
          -0.143,
        );
        add(glassGeo, B({ map: lensTex }), x, y, -0.1435, 0, Math.PI);
      });
      add(
        flashGeo,
        B({ color: 0xfff2cc }),
        IX + 0.1,
        IY - 0.085,
        -0.116,
        0,
        Math.PI,
      );
      add(
        flashRing,
        P({ color: 0xcdd8ee, specular: 0xffffff, shininess: 100 }),
        IX + 0.1,
        IY - 0.085,
        -0.117,
      );
      return g;
    }
    const previewCanvas = document.createElement("canvas");
    previewCanvas.width = SW;
    previewCanvas.height = SH;
    const previewCtx = previewCanvas.getContext("2d");
    const previewTex = tex(previewCanvas);
    const phone = makePhone(),
      phoneRef = makePhone(0.16),
      phone2 = makePhone(undefined, previewTex),
      phoneRef2 = makePhone(0.16, previewTex);
    scene.add(phone, phoneRef, phone2, phoneRef2);
    // Camera-facing pick planes stay steady while the hardware turns.
    const phonePickGeo = new THREE.PlaneGeometry(PW * 1.24, PH * 1.1);
    const phonePickMaterial = new THREE.MeshBasicMaterial({
      visible: false,
      side: THREE.DoubleSide,
    });
    const phonePicks = [0, 1].map((index) => {
      const pick = new THREE.Mesh(phonePickGeo, phonePickMaterial);
      pick.userData.phoneIndex = index;
      scene.add(pick);
      return pick;
    });
    const phoneAngles = [
      { x: 0.05, y: -0.35 },
      { x: 0, y: Math.PI + 0.35 },
    ];
    let hoveredPhone = -1,
      touchedPhone = -1,
      phonePointerX = 0,
      phonePointerY = 0;

    /* floor glow */
    const fc = document.createElement("canvas");
    fc.width = fc.height = 256;
    {
      const g = fc.getContext("2d");
      const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      r.addColorStop(0, "rgba(60,150,255,.55)");
      r.addColorStop(0.5, "rgba(30,90,200,.18)");
      r.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = r;
      g.fillRect(0, 0, 256, 256);
    }
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 8),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(fc),
        transparent: true,
        depthWrite: false,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    /* particles */
    const N = reduce ? 1200 : 3000;
    const pos = new Float32Array(N * 3),
      U = new Float32Array(N),
      SP = new Float32Array(N),
      K = new Uint8Array(N),
      OFF = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      U[i] = Math.random();
      SP[i] = 0.012 + Math.random() * 0.03;
      K[i] = i % 3;
      for (let j = 0; j < 3; j++)
        OFF[i * 3 + j] = Math.random() + Math.random() + Math.random() - 1.5;
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const spc = document.createElement("canvas");
    spc.width = spc.height = 64;
    {
      const g = spc.getContext("2d");
      const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      r.addColorStop(0, "rgba(255,255,255,1)");
      r.addColorStop(0.25, "rgba(120,220,255,.8)");
      r.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = r;
      g.fillRect(0, 0, 64, 64);
    }
    const pm = new THREE.PointsMaterial({
      size: 0.07,
      map: new THREE.CanvasTexture(spc),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0x66ccff,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(pg, pm);
    points.frustumCulled = false;
    scene.add(points);

    /* layout */
    let W = 1,
      Hh = 1,
      mobile = false,
      sceneLayouts = [];
    function resize() {
      W = innerWidth;
      Hh = innerHeight;
      renderer.setSize(W, Hh, false);
      cam.aspect = W / Hh;
      cam.updateProjectionMatrix();
      mobile = W < 720 || W / Hh < 0.95;
      document.body.classList.toggle("mob", mobile);
      rebuildSoon();
    }
    addEventListener("resize", resize);
    resize();
    const RY = [-0.35, 0.55, -0.6, 0.6, -0.45, -0.28],
      RX = [0.05, 0.08, -0.05, 0.06, 0, 0];
    let sceneLast = Math.max(1, storyPanels.length - 1);
    function frame(k) {
      const cz = mobile ? 9 : 6.4;
      const vh = 2 * cz * Math.tan(THREE.MathUtils.degToRad(20)),
        vw = vh * cam.aspect;
      const short = mobile && Hh < 640;
      const duo = (k === 0 || k === sceneLast) && !short ? 1 : 0;
      const region = sceneLayouts[k]?.phones;
      const pxPerUnit = Hh / vh;
      const s = region
        ? Math.max(
            0.01,
            Math.min(
              region.height / ((short ? 4.4 : 2.65) * pxPerUnit),
              region.width / ((duo ? 2.75 : short ? 2.4 : 1.6) * pxPerUnit),
            ),
          )
        : 0.7;
      const dx = duo ? s * 1.3 : 0;
      const x = region
        ? (region.x + region.width / 2 - W / 2) / pxPerUnit - dx / 2
        : 0;
      const y = region
        ? (Hh / 2 - region.y - region.height * (short ? 0.5 : 0.43)) /
          pxPerUnit
        : 0;
      const clipY = region
        ? (Hh / 2 - region.y - region.height) / pxPerUnit
        : -vh / 2;
      return { cz, vw, vh, x, y, s, ry: RY[k], rx: RX[k], d: duo, dx, clipY };
    }

    /* ---------- 3D text panels (Three.js) ---------- */
    const dpr = Math.min(devicePixelRatio || 1, 2),
      MC = document.createElement("canvas").getContext("2d");
    const HF = (sz) => "700 " + sz + "px 'Outfit',sans-serif",
      BF = (sz, w) => (w || 400) + " " + sz + "px 'Manrope',sans-serif";
    const PDATA = [...document.querySelectorAll(".p")].map((p) => ({
      i: +p.dataset.i,
      icon: p.dataset.icon,
      eyebrow: (p.dataset.eyebrow || "").trim(),
      iconLength: p.querySelector(".story-icon path")?.getTotalLength() || 120,
      hero: p.classList.contains("hero"),
      cta: p.classList.contains("cta"),
      h: p.querySelector("h2").textContent.trim(),
      p: [...p.querySelectorAll("p:not(.meta)")].map((e) =>
        e.textContent.trim(),
      ),
      meta: (p.querySelector("p.meta") || {}).textContent || "",
      chips: [...p.querySelectorAll("li")].map((e) => e.textContent.trim()),
      capabilities: [...p.querySelectorAll(".hero-capabilities > span")].map(
        (e) => ({
          t: e.textContent.trim(),
          icon: e.querySelector(".ic")?.dataset.ic,
        }),
      ),
      btns: [...p.querySelectorAll("a.pill")].map((a) => ({
        t: a.textContent.trim(),
        href: a.getAttribute("href"),
        ghost: a.classList.contains("ghost"),
      })),
    }));
    sceneLast = Math.max(1, PDATA.length - 1);
    var panelsReady = false,
      rbT = 0;
    let panelObjs = [],
      ppu = 170,
      hoverEl = null,
      pressedEl = null,
      pointerDown = null,
      pointerValid = false,
      boundsKey = "",
      staticFrameKey = "";
    const canvas = document.getElementById("gl");
    const ray = new THREE.Raycaster(),
      ptr = new THREE.Vector2(9, 9);
    function selectDemo(index, label) {
      const demo = getStoryDemo(index, label, L);
      if (!demo) return;
      selectedDemos[index] = demo;
      if (demo.available) {
        demoScreenKeys[index] = demo.key;
        demoScreenLabels[index] = demo.showing;
        activeDemoLabels[index] = label;
      }
      document
        .querySelectorAll(`[data-demo-scene="${index}"]`)
        .forEach((button) => {
          button.setAttribute(
            "aria-pressed",
            String(button.dataset.demoChip === activeDemoLabels[index]),
          );
        });
      demoRevision++;
      boundsKey = "";
      staticFrameKey = "";
    }
    listen(root, "click", (event) => {
      const button = event.target.closest?.("[data-demo-chip]");
      if (button && root.contains(button))
        selectDemo(Number(button.dataset.demoScene), button.dataset.demoChip);
    });
    function updateDemoStatus(index) {
      const selected = selectedDemos[index];
      root.dataset.sceneDemo = JSON.stringify({
        index,
        screen: screenKey(index),
        textureVersion: screenTex.version,
        showing: demoScreenLabels[index],
        selected: activeDemoLabels[index],
        requested: selected?.label || null,
        pending: Boolean(selected && !selected.available),
        revision: demoRevision,
      });
    }
    function rebuildSoon() {
      if (!panelsReady) return;
      clearTimeout(rbT);
      rbT = setTimeout(layoutPanels, 160);
    }
    function mkPlane(wPx, hPx, draw) {
      const cv = document.createElement("canvas");
      cv.width = Math.ceil(wPx * dpr);
      cv.height = Math.ceil(hPx * dpr);
      const g = cv.getContext("2d");
      g.scale(dpr, dpr);
      draw(g);
      const t = new THREE.CanvasTexture(cv);
      t.generateMipmaps = false;
      t.minFilter = THREE.LinearFilter;
      t.anisotropy = aniso;
      const m = new THREE.MeshBasicMaterial({
        map: t,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        fog: false,
      });
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(wPx / ppu, hPx / ppu),
        m,
      );
      mesh.renderOrder = 20;
      return mesh;
    }
    function lineWrap(words, font, maxW) {
      MC.font = font;
      const sp = MC.measureText(" ").width,
        lines = [];
      let cur = [],
        cw = 0;
      words.forEach((w) => {
        const ww = MC.measureText(w).width;
        if (cur.length && cw + sp + ww > maxW) {
          lines.push(cur);
          cur = [];
          cw = 0;
        }
        cw += (cur.length ? sp : 0) + ww;
        cur.push({ w, ww });
      });
      if (cur.length) lines.push(cur);
      return { lines, sp };
    }
    function buildPanel(P) {
      const mob = mobile,
        compact = Hh < 760,
        hs = mob
          ? compact
            ? 22
            : W < 360
              ? 24
              : 26
          : Math.round(
              clamp(
                W * (P.hero ? 0.026 : 0.022),
                28,
                compact ? 30 : P.hero ? 38 : 34,
              ),
            ),
        bs = mob
          ? compact
            ? 14
            : 15
          : compact
            ? 15
            : Math.round(clamp(W * 0.0115, 16, 18)),
        hlh = Math.round(hs * 1.2),
        blh = Math.round(bs * 1.7);
      const pw = mob
        ? W * 0.9
        : P.hero
          ? clamp(W * 0.42, 380, 560)
          : P.cta
            ? Math.min(W * (Hh < 650 ? 0.43 : 0.82), 640)
            : clamp(W * 0.34, 320, 470);
      const pad = P.hero ? 0 : compact ? 18 : mob ? 22 : 30,
        cw = pw - 2 * pad,
        ctr = P.cta,
        els = [];
      let y = pad + (P.hero ? 0 : 6),
        n = 0;
      const add = (mesh, x, yy, z, kind, extra) => {
        const e = Object.assign(
          { mesh, x, y: yy, z, kind, sceneIndex: P.i, ord: n++ },
          extra || {},
        );
        // Phones/reflections keep their depth, but must never erase readable text.
        mesh.material.depthTest = kind === "card";
        mesh.renderOrder = kind === "card" ? 20 : kind === "icon" ? 22 : 21;
        els.push(e);
        return e;
      };
      if (ICON_PATHS[P.icon]) {
        const size = compact ? 32 : mob ? 40 : 48;
        const ix = ctr ? pw / 2 : pad + size / 2;
        const badge = mkPlane(size, size, (g) => {
          const gr = g.createLinearGradient(0, 0, size, size);
          gr.addColorStop(0, "rgba(79,209,255,.24)");
          gr.addColorStop(1, "rgba(29,107,255,.12)");
          rr(g, 1, 1, size - 2, size - 2, 14);
          g.fillStyle = gr;
          g.fill();
          g.strokeStyle = "rgba(120,190,255,.5)";
          g.lineWidth = 1;
          g.stroke();
        });
        add(badge, ix, y + size / 2, 0.11, "iconBadge");
        const path = new Path2D(ICON_PATHS[P.icon]);
        const drawIcon = (g, progress) => {
          g.clearRect(0, 0, size, size);
          g.save();
          const inset = size * 0.23;
          g.translate(inset, inset);
          g.scale((size - 2 * inset) / 24, (size - 2 * inset) / 24);
          g.strokeStyle = "#83e1ff";
          g.lineWidth = 1.8;
          g.lineCap = "round";
          g.lineJoin = "round";
          g.setLineDash([P.iconLength]);
          g.lineDashOffset = P.iconLength * (1 - progress);
          g.stroke(path);
          g.restore();
        };
        const glyph = mkPlane(size, size, (g) => drawIcon(g, reduce ? 1 : 0));
        add(glyph, ix, y + size / 2, 0.14, "icon", {
          trace: reduce ? 1 : 0,
          redraw: (progress) => {
            drawIcon(glyph.material.map.image.getContext("2d"), progress);
            glyph.material.map.needsUpdate = true;
          },
        });
        if (!ctr) {
          const kicker = `${String(P.i + 1).padStart(2, "0")} / ${String(PDATA.length).padStart(2, "0")}  ·  ${P.eyebrow}`;
          const kw = Math.max(48, cw - size - 10);
          const label = mkPlane(kw, 24, (g) => {
            g.font = "500 12px 'Outfit',sans-serif";
            g.fillStyle = "#7ccfff";
            g.textBaseline = "middle";
            g.fillText(kicker, 2, 12);
          });
          add(label, pad + size + 10 + kw / 2, y + size / 2, 0.1, "line");
        }
        y += size + (compact ? 10 : mob ? 12 : 16);
      }
      const H = lineWrap(P.h.split(" "), HF(hs), cw);
      H.lines.forEach((line) => {
        const lw =
          line.reduce((a, b) => a + b.ww, 0) + H.sp * (line.length - 1);
        let x = ctr ? (cw - lw) / 2 : 0;
        line.forEach((o) => {
          const wpx = Math.ceil(o.ww) + 16,
            hpx = hlh + 12;
          const m = mkPlane(wpx, hpx, (g) => {
            g.font = HF(hs);
            g.textBaseline = "middle";
            const gr = g.createLinearGradient(0, 0, 0, hpx);
            gr.addColorStop(0, "#ffffff");
            gr.addColorStop(1, "#bfe1ff");
            g.fillStyle = gr;
            g.shadowColor = "rgba(79,209,255,.35)";
            g.shadowBlur = 10;
            g.fillText(o.w, 8, hpx / 2 + 1);
          });
          add(m, pad + x + o.ww / 2, y + hlh / 2, 0.12, "word");
          x += o.ww + H.sp;
        });
        y += hlh;
      });
      y += 12;
      P.p.forEach((txt) => {
        const B = lineWrap(txt.split(" "), BF(bs), cw);
        B.lines.forEach((line) => {
          const str = line.map((o) => o.w).join(" ");
          MC.font = BF(bs);
          const lw = MC.measureText(str).width,
            wpx = Math.ceil(lw) + 16,
            hpx = blh + 6;
          const m = mkPlane(wpx, hpx, (g) => {
            g.font = BF(bs);
            g.textBaseline = "middle";
            g.fillStyle = P.hero ? "#b9cdea" : "#9db4d6";
            g.fillText(str, 8, hpx / 2 + 1);
          });
          add(
            m,
            pad + (ctr ? (cw - lw) / 2 : 0) + lw / 2,
            y + blh / 2,
            0.07,
            "line",
          );
          y += blh;
        });
        y += 6;
      });
      if (P.chips.length) {
        y += 10;
        const cs = compact ? 12 : 13,
          gap = compact ? 8 : 10,
          cols = 2,
          colW = Math.floor((cw - gap * (cols - 1)) / cols),
          inset = compact ? 10 : 12,
          iconSize = 18,
          textW = colW - inset - iconSize - 8,
          lineH = cs + 4;
        const items = P.chips.map((t) => {
          const wrapped = lineWrap(t.split(" "), BF(cs, 500), textW);
          return {
            t,
            w: colW,
            h: Math.max(compact ? 42 : 46, wrapped.lines.length * lineH + 18),
            wrapped,
            icon: featureIcons[t] || P.icon,
          };
        });
        for (let i = 0; i < items.length; i += cols) {
          const row = items.slice(i, i + cols);
          const ch = Math.max(...row.map((it) => it.h));
          row.forEach((it, col) => {
            const x = col * (colW + gap);
            const paint = (g, { selected, hover, pressed, pending } = {}) => {
              g.clearRect(0, 0, it.w, ch);
              rr(g, 1, 1, it.w - 2, ch - 2, 12);
              g.fillStyle = pressed
                ? "#225b8e"
                : hover
                  ? "#16476d"
                  : selected
                    ? "#123c60"
                    : "#0e233b";
              g.fill();
              g.strokeStyle = pending
                ? "#f4bc67"
                : hover || selected
                  ? "#8be1ff"
                  : "#42688b";
              g.lineWidth = hover || selected || pending ? 1.5 : 1;
              g.stroke();
              g.save();
              g.translate(inset, (ch - iconSize) / 2);
              g.scale(iconSize / 24, iconSize / 24);
              g.strokeStyle = pending
                ? "#f4bc67"
                : hover
                  ? "#ffffff"
                  : "#8befff";
              g.lineWidth = 2.1;
              g.lineCap = "round";
              g.lineJoin = "round";
              try {
                if (ICON_PATHS[it.icon])
                  g.stroke(new Path2D(ICON_PATHS[it.icon]));
              } catch (e) {}
              g.restore();
              g.font = BF(cs, 500);
              g.fillStyle = hover || selected ? "#ffffff" : "#d4e5fb";
              g.textAlign = "left";
              g.textBaseline = "middle";
              const startY =
                (ch - (it.wrapped.lines.length - 1) * lineH) / 2;
              it.wrapped.lines.forEach((line, lineIndex) => {
                g.fillText(
                  line.map((o) => o.w).join(" "),
                  inset + iconSize + 6,
                  startY + lineIndex * lineH + 1,
                );
              });
            };
            const selected = activeDemoLabels[P.i] === it.t;
            const m = mkPlane(it.w, ch, (g) => paint(g, { selected }));
            add(m, pad + x + it.w / 2, y + ch / 2, 0.1, "chip", {
              label: it.t,
              demo: getStoryDemo(P.i, it.t, L),
              selected,
              redraw: (state) => {
                const g = m.material.map.image.getContext("2d");
                paint(g, state);
                m.material.map.needsUpdate = true;
              },
            });
          });
          y += ch + gap;
        }
        y += 4;
      }
      if (P.capabilities.length) {
        y += compact ? 6 : 10;
        let x = 0;
        P.capabilities.forEach(({ t, icon }) => {
          MC.font = BF(12, 500);
          const w = Math.ceil(MC.measureText(t).width) + 43;
          if (x && x + w > cw) {
            x = 0;
            y += 38;
          }
          const paint = (g, { selected, hover, pressed, pending } = {}) => {
            g.clearRect(0, 0, w, 32);
            rr(g, 1, 1, w - 2, 30, 10);
            const gr = g.createLinearGradient(0, 0, w, 32);
            gr.addColorStop(
              0,
              pressed
                ? "#225b8e"
                : hover
                  ? "#1b547c"
                  : selected
                    ? "#164464"
                    : "#102b43",
            );
            gr.addColorStop(1, hover ? "#163c63" : "#0a1b33");
            g.fillStyle = gr;
            g.fill();
            g.strokeStyle = pending
              ? "#f4bc67"
              : hover || selected
                ? "#8be1ff"
                : "#42688b";
            g.stroke();
            g.save();
            g.translate(10, 8);
            g.scale(16 / 24, 16 / 24);
            g.strokeStyle = "#83e1ff";
            g.lineWidth = 1.8;
            g.lineCap = "round";
            g.lineJoin = "round";
            try {
              if (ICON_PATHS[icon]) g.stroke(new Path2D(ICON_PATHS[icon]));
            } catch (e) {}
            g.restore();
            g.font = BF(12, 500);
            g.fillStyle = "#c8e6ff";
            g.textBaseline = "middle";
            g.fillText(t, 32, 17);
          };
          const selected = activeDemoLabels[P.i] === t;
          const m = mkPlane(w, 32, (g) => paint(g, { selected }));
          add(m, pad + x + w / 2, y + 16, 0.1, "chip", {
            label: t,
            demo: getStoryDemo(P.i, t, L),
            selected,
            redraw: (state) => {
              const g = m.material.map.image.getContext("2d");
              paint(g, state);
              m.material.map.needsUpdate = true;
            },
          });
          x += w + 8;
        });
        y += 32;
      }
      if (P.btns.length) {
        y += 14;
        const bh = compact ? 44 : mob ? 46 : 50,
          bfs = compact ? 14 : 15,
          gap = compact ? 8 : 12;
        let x = 0;
        P.btns.forEach((b) => {
          MC.font = BF(bfs, 600);
          const w =
            Math.ceil(MC.measureText(b.t).width) +
            (compact ? 32 : mob ? 44 : 56);
          if (x > 0 && x + w > cw) {
            x = 0;
            y += bh + 10;
          }
          const paint = (g, { hover, pressed } = {}) => {
            g.clearRect(0, 0, w, bh);
            rr(g, 1, 1, w - 2, bh - 2, (bh - 2) / 2);
            if (b.ghost) {
              g.fillStyle = pressed ? "#225b8e" : hover ? "#1e496c" : "#15283e";
              g.fill();
              g.strokeStyle = hover ? "#8be1ff" : "#42688b";
              g.lineWidth = 1;
              g.stroke();
            } else {
              const gr = g.createLinearGradient(0, 0, w, 0);
              gr.addColorStop(
                0,
                pressed ? "#1254c8" : hover ? "#3d91ff" : "#1d6bff",
              );
              gr.addColorStop(1, hover ? "#91edff" : "#4fd1ff");
              g.fillStyle = gr;
              g.fill();
            }
            g.font = BF(bfs, 600);
            g.fillStyle = b.ghost ? "#eaf3ff" : "#02112b";
            g.textAlign = "center";
            g.textBaseline = "middle";
            g.fillText(b.t, w / 2, bh / 2 + 1);
          };
          const m = mkPlane(w, bh, (g) => paint(g));
          add(m, pad + x + w / 2, y + bh / 2, 0.1, "btn", {
            href: b.href,
            redraw: (state) => {
              paint(m.material.map.image.getContext("2d"), state);
              m.material.map.needsUpdate = true;
            },
          });
          x += w + gap;
        });
        y += bh;
      }
      if (P.meta) {
        y += 16;
        MC.font = BF(14);
        const lw = MC.measureText(P.meta).width,
          wpx = Math.ceil(lw) + 16,
          hpx = 24;
        const m = mkPlane(wpx, hpx, (g) => {
          g.font = BF(14);
          g.textBaseline = "middle";
          g.fillStyle = "rgba(157,180,214,.85)";
          g.fillText(P.meta, 8, hpx / 2 + 1);
        });
        add(m, pad + lw / 2, y + hpx / 2, 0.06, "line");
        y += hpx;
      }
      const ph = y + pad,
        N = Math.max(1, els.length);
      els.forEach((e) => {
        e.k = 0.05 + (e.ord / N) * 0.62;
      });
      if (!P.hero) {
        const card = mkPlane(pw, ph, (g) => {
          const gr = g.createLinearGradient(0, 0, 0, ph);
          gr.addColorStop(0, "rgba(18,43,87,.94)");
          gr.addColorStop(1, "rgba(6,18,40,.96)");
          rr(g, 1, 1, pw - 2, ph - 2, 26);
          g.fillStyle = gr;
          g.fill();
          g.strokeStyle = "rgba(120,190,255,.45)";
          g.lineWidth = 1.5;
          g.stroke();
          g.save();
          g.clip();
          const light = g.createRadialGradient(20, 0, 0, 20, 0, pw * 0.85);
          light.addColorStop(0, "rgba(79,209,255,.13)");
          light.addColorStop(1, "rgba(79,209,255,0)");
          g.fillStyle = light;
          g.fillRect(0, 0, pw, ph);
          g.restore();
          rr(g, 7, 7, pw - 14, ph - 14, 21);
          g.strokeStyle = "rgba(210,240,255,.07)";
          g.lineWidth = 1;
          g.stroke();
          g.strokeStyle = "rgba(79,209,255,.5)";
          g.beginPath();
          g.moveTo(pw - 44, 18);
          g.lineTo(pw - 18, 18);
          g.lineTo(pw - 18, 44);
          g.stroke();
        });
        add(card, pw / 2, ph / 2, -0.05, "card").k = 0;
        const edge = mkPlane(pw, ph, (g) => {
          const gr = g.createLinearGradient(0, 0, pw, ph);
          gr.addColorStop(0, "rgba(130,225,255,.85)");
          gr.addColorStop(0.35, "rgba(79,209,255,0)");
          gr.addColorStop(0.7, "rgba(29,107,255,0)");
          gr.addColorStop(1, "rgba(79,209,255,.65)");
          rr(g, 3, 3, pw - 6, ph - 6, 24);
          g.strokeStyle = gr;
          g.lineWidth = 2;
          g.stroke();
        });
        const edgeElement = add(edge, pw / 2, ph / 2, 0, "cardGlow");
        edgeElement.k = 0.02;
        edge.renderOrder = 20;
        const acc = mkPlane(60, 4, (g) => {
          const gr = g.createLinearGradient(0, 0, 60, 0);
          gr.addColorStop(0, "#4fd1ff");
          gr.addColorStop(1, "#1d6bff");
          rr(g, 0, 0, 60, 4, 2);
          g.fillStyle = gr;
          g.fill();
        });
        add(acc, ctr ? pw / 2 : pad + 30, 2, 0.0, "accent").k = 0.03;
      }
      const layout = computeStoryLayout({
        width: W,
        height: Hh,
        mobile: mob,
        panelWidth: pw,
        panelHeight: ph,
        index: P.i,
        lastIndex: sceneLast,
        headerBottom: document.querySelector("header").getBoundingClientRect()
          .bottom,
      });
      sceneLayouts[P.i] = layout;
      const { content, stage, contentScale } = layout;
      const x = (content.x + content.width / 2 - W / 2) / ppu;
      const yw = (Hh / 2 - content.y - content.height / 2) / ppu;
      const ry = 0;
      // Compensate perspective so the recessed frame matches its screen-space bounds.
      const stageScale = 1 + 0.35 / frame(P.i).cz;
      const stagePlane = mkPlane(stage.width, stage.height, (g) => {
        rr(
          g,
          1,
          1,
          stage.width - 2,
          stage.height - 2,
          Math.min(32, stage.height / 4),
        );
        const gr = g.createLinearGradient(0, 0, stage.width, stage.height);
        gr.addColorStop(0, "rgba(20,51,96,.38)");
        gr.addColorStop(0.5, "rgba(7,20,45,.16)");
        gr.addColorStop(1, "rgba(16,52,93,.44)");
        g.fillStyle = gr;
        g.fill();
        g.strokeStyle = "rgba(106,184,255,.32)";
        g.lineWidth = 1.5;
        g.stroke();
        g.save();
        g.clip();
        const glow = g.createRadialGradient(
          stage.width / 2,
          stage.height * 0.5,
          0,
          stage.width / 2,
          stage.height * 0.5,
          stage.width * 0.7,
        );
        glow.addColorStop(0, "rgba(29,107,255,.2)");
        glow.addColorStop(1, "rgba(29,107,255,0)");
        g.fillStyle = glow;
        g.fillRect(0, 0, stage.width, stage.height);
        g.strokeStyle = "rgba(105,185,255,.065)";
        g.lineWidth = 1;
        for (let i = 32; i < stage.width; i += 38) {
          g.beginPath();
          g.moveTo(i, 0);
          g.lineTo(i, stage.height);
          g.stroke();
        }
        for (let i = 30; i < stage.height; i += 38) {
          g.beginPath();
          g.moveTo(0, i);
          g.lineTo(stage.width, i);
          g.stroke();
        }
        g.strokeStyle = "rgba(79,209,255,.15)";
        [0.32, 0.4, 0.48].forEach((r) => {
          g.beginPath();
          g.ellipse(
            stage.width / 2,
            stage.height * 0.64,
            stage.width * r,
            stage.height * 0.12,
            0,
            0,
            Math.PI * 2,
          );
          g.stroke();
        });
        g.restore();
        g.strokeStyle = "rgba(132,218,255,.7)";
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(24, 48);
        g.lineTo(24, 24);
        g.lineTo(48, 24);
        g.stroke();
        g.beginPath();
        g.moveTo(stage.width - 48, stage.height - 24);
        g.lineTo(stage.width - 24, stage.height - 24);
        g.lineTo(stage.width - 24, stage.height - 48);
        g.stroke();
      });
      const stageElement = add(
        stagePlane,
        stage.x - content.x + stage.width / 2,
        stage.y - content.y + stage.height / 2,
        -0.35,
        "stage",
      );
      stageElement.k = 0;
      stagePlane.material.depthTest = true;
      stagePlane.renderOrder = -5;
      const g = new THREE.Group();
      els.forEach((e) => {
        const isStage = e.kind === "stage";
        const depthScale = isStage ? stageScale : 1 - e.z / frame(P.i).cz;
        const screenX = isStage
          ? stage.x + stage.width / 2
          : content.x + e.x * contentScale;
        const screenY = isStage
          ? stage.y + stage.height / 2
          : content.y + e.y * contentScale;
        // Different text/card depths must project to the same padding grid.
        e.baseScale = (isStage ? 1 : contentScale) * depthScale;
        e.wx = ((screenX - W / 2) * depthScale) / ppu - x;
        e.wy = ((Hh / 2 - screenY) * depthScale) / ppu - yw;
        e.mesh.scale.set(e.baseScale, e.baseScale, 1);
        e.mesh.position.set(e.wx, e.wy, e.z);
        g.add(e.mesh);
      });
      g.position.set(x, yw, 0);
      g.visible = false;
      scene.add(g);
      return { g, els, i: P.i, x, y: yw, ry, w: 0 };
    }
    function disposePanels() {
      panelObjs.forEach((P) => {
        scene.remove(P.g);
        P.g.traverse((o) => {
          if (o.isMesh) {
            o.geometry.dispose();
            if (o.material.map) o.material.map.dispose();
            o.material.dispose();
          }
        });
      });
      panelObjs = [];
    }
    function layoutPanels() {
      disposePanels();
      ppu = Hh / frame(0).vh;
      panelObjs = PDATA.map(buildPanel);
      boundsKey = "";
      staticFrameKey = "";
    }
    function visibleControls() {
      return panelObjs
        .filter((p) => p.g.visible)
        .flatMap((p) =>
          p.els.filter(
            (e) =>
              (e.kind === "btn" || (e.kind === "chip" && e.demo)) &&
              e.mesh.material.opacity > 0.08,
          ),
        );
    }
    function setPointer(event) {
      const rect = canvas.getBoundingClientRect();
      pointerValid = rect.width > 0 && rect.height > 0;
      ptr.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      staticFrameKey = "";
    }
    function testBtn() {
      hoverEl = null;
      if (!pointerValid) return;
      cam.updateMatrixWorld(true);
      scene.updateMatrixWorld(true);
      ray.setFromCamera(ptr, cam);
      const controls = visibleControls();
      const hit = ray.intersectObjects(
        controls.map((e) => e.mesh),
        false,
      )[0];
      if (hit) hoverEl = controls.find((e) => e.mesh === hit.object) || null;
    }
    function paintControls() {
      visibleControls().forEach((e) => {
        const requested = selectedDemos[e.sceneIndex];
        const state = {
          selected: activeDemoLabels[e.sceneIndex] === e.label,
          hover: e === hoverEl,
          pressed: e === pressedEl,
          pending: Boolean(
            requested && requested.label === e.label && !requested.available,
          ),
        };
        const key = JSON.stringify(state);
        if (e.visualKey !== key) {
          e.redraw(state);
          e.visualKey = key;
          e.selected = state.selected;
        }
      });
      root.dataset.controlHover = hoverEl?.label || hoverEl?.href || "";
      canvas.style.cursor = hoverEl
        ? "pointer"
        : hoveredPhone >= 0
          ? "grab"
          : "";
    }
    function clearPointer() {
      pointerValid = false;
      ptr.set(9, 9);
      hoverEl = pressedEl = pointerDown = null;
      hoveredPhone = -1;
      phonePointerX = phonePointerY = 0;
      root.dataset.phoneHover = "-1";
      boundsKey = staticFrameKey = "";
      paintControls();
    }
    function testPhonePointer() {
      ray.setFromCamera(ptr, cam);
      scene.updateMatrixWorld(true);
      const hit = ray.intersectObjects(
        phonePicks.filter((p) => p.visible),
        false,
      )[0];
      hoveredPhone = hit ? hit.object.userData.phoneIndex : -1;
      if (hit) {
        const box = projectedBounds(hit.object);
        phonePointerX =
          clamp((((ptr.x + 1) * W) / 2 - box.x) / box.width - 0.5, -0.5, 0.5) *
          2;
        phonePointerY =
          clamp(
            (((1 - ptr.y) * Hh) / 2 - box.y) / box.height - 0.5,
            -0.5,
            0.5,
          ) * 2;
      } else {
        phonePointerX = phonePointerY = 0;
      }
      root.dataset.phoneHover = String(hoveredPhone);
      boundsKey = "";
      staticFrameKey = "";
    }
    function updatePanels(f, t, fade, introT) {
      panelObjs.forEach((P) => {
        const dir = f - P.i;
        let w = clamp(1 - Math.abs(dir) * 2.2, 0, 1) * fade;
        if (P.i === 0) w *= introT;
        P.w = w;
        P.g.visible = w > 0.003;
        if (!P.g.visible) return;
        // The frame stays aligned; only its layered contents reveal in depth.
        P.g.position.set(P.x, P.y, 0);
        P.g.rotation.set(0, P.ry, 0);
        const up = dir < 0 ? -1 : 1;
        P.els.forEach((e) => {
          const r = sm(clamp((w * 1.5 - e.k) / 0.5, 0, 1)),
            control = e.kind === "chip" || e.kind === "btn",
            inv = reduce || control ? 0 : 1 - r,
            m = e.mesh;
          m.material.opacity =
            e.kind === "cardGlow"
              ? r * (reduce ? 0.3 : 0.3 + Math.sin(t * 1.4 + P.i) * 0.18)
              : e.kind === "iconBadge" && !reduce
                ? r * (0.87 + Math.sin(t * 1.8 + P.i) * 0.13)
                : r;
          m.position.set(
            e.wx + (e.kind === "line" ? inv * 0.08 * up : 0),
            e.wy +
              inv *
                0.26 *
                up *
                (["card", "cardGlow", "stage"].includes(e.kind) ? 0 : 1),
            e.z -
              inv * (["card", "cardGlow", "stage"].includes(e.kind) ? 0 : 0.7),
          );
          m.rotation.x = e.kind === "word" ? inv * up * 0.65 : 0;
          const sc = ["chip", "btn", "icon", "iconBadge"].includes(e.kind)
            ? 1 - inv * 0.2
            : 1;
          m.scale.set(
            (e.kind === "accent" && !reduce ? r : sc) * e.baseScale,
            sc * e.baseScale,
            1,
          );
          if (e.kind === "icon") {
            const trace = reduce ? 1 : r;
            if (
              Math.abs(trace - e.trace) > 0.01 ||
              (trace === 1 && e.trace !== 1)
            ) {
              e.redraw(trace);
              e.trace = trace;
            }
          }
        });
      });
      // Hit testing follows current transforms; paint in this same frame, including reduced motion.
      testBtn();
      paintControls();
      root.dataset.sceneControls = JSON.stringify(
        visibleControls().map((e) => ({
          scene: e.sceneIndex,
          label: e.label,
          href: e.href,
          opacity: e.mesh.material.opacity,
          hover: e === hoverEl,
          selected: e.selected,
          visualKey: e.visualKey,
          textureScale: e.mesh.material.map.image
            .getContext("2d")
            .getTransform().a,
          ...projectedBounds(e.mesh),
        })),
      );
    }
    listen(canvas, "click", (event) => {
      setPointer(event);
      testBtn();
      const moved =
        pointerDown &&
        Math.hypot(
          event.clientX - pointerDown.x,
          event.clientY - pointerDown.y,
        ) > 10;
      const started = pointerDown?.control;
      const sameControl =
        !pointerDown ||
        (started &&
          hoverEl &&
          started.sceneIndex === hoverEl.sceneIndex &&
          started.label === hoverEl.label &&
          started.href === hoverEl.href);
      pointerDown = pressedEl = null;
      if (!moved && sameControl) {
        if (hoverEl?.kind === "chip")
          selectDemo(hoverEl.sceneIndex, hoverEl.label);
        else if (hoverEl?.href)
          document
            .querySelector(hoverEl.href)
            ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
      }
      paintControls();
      staticFrameKey = "";
    });
    listen(canvas, "pointerdown", (event) => {
      setPointer(event);
      testBtn();
      pointerDown = { x: event.clientX, y: event.clientY, control: hoverEl };
      pressedEl = hoverEl;
      if (!hoverEl && event.pointerType === "touch") {
        testPhonePointer();
        touchedPhone = touchedPhone === hoveredPhone ? -1 : hoveredPhone;
        hoveredPhone = -1;
      }
      paintControls();
      staticFrameKey = "";
    });
    listen(canvas, "pointerup", () => {
      pressedEl = null;
      staticFrameKey = "";
    });
    listen(canvas, "pointercancel", clearPointer);
    listen(canvas, "pointerleave", clearPointer);
    addEventListener("blur", clearPointer);
    layoutPanels();
    panelsReady = true;

    /* ---------- gallery: second Three.js scene ---------- */
    (function () {
      const gal = document.getElementById("gal"),
        cv = document.getElementById("galc");
      if (!gal || !cv) return;
      let gr;
      try {
        gr = keepRenderer(
          new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }),
        );
      } catch (e) {
        gal.classList.add("fb");
        return;
      }
      gr.setPixelRatio(Math.min(devicePixelRatio, 2));
      gr.setClearColor(0x000000, 0);
      const gs = keepScene(new THREE.Scene()),
        gc = new THREE.PerspectiveCamera(32, 2, 0.1, 50);
      gc.position.set(0, 0, 9);
      gs.add(new THREE.AmbientLight(0xd4dae3, 0.62));
      const gd = new THREE.DirectionalLight(0xffffff, 1.05);
      gd.position.set(2, 4, 6);
      gs.add(gd);
      const gp = new THREE.PointLight(0xd5e4ff, 0.58, 16);
      gp.position.set(-4, 1, 4);
      gs.add(gp);
      const gp2 = new THREE.PointLight(0x7197cf, 0.4, 16);
      gp2.position.set(4, -1, 4);
      gs.add(gp2);
      const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(15, 7),
        new THREE.MeshBasicMaterial({
          map: new THREE.CanvasTexture(fc),
          transparent: true,
          depthWrite: false,
          opacity: 0.9,
        }),
      );
      glow.position.set(0, -1.2, -2.5);
      gs.add(glow);
      const bodyM = () => new THREE.MeshPhongMaterial(hardwareFinish);
      const items = ["gmenu", "gsale", "gmonth"].map((k, i) => {
        const q = document.createElement("canvas");
        q.width = 480;
        q.height = 1020;
        const x = q.getContext("2d");
        x.save();
        rr(x, 0, 0, 480, 1020, 54);
        x.clip();
        x.fillStyle = "#f5f7fc";
        x.fillRect(0, 0, 480, 1020);
        const im = L[k];
        if (im && im.width) {
          const s = Math.min(480 / im.width, 1020 / im.height),
            w = im.width * s,
            h = im.height * s;
          x.drawImage(im, (480 - w) / 2, (1020 - h) / 2, w, h);
        }
        x.restore();
        const g = new THREE.Group();
        g.userData.i = i;
        const add = (geo, mat, z) => {
          const m = new THREE.Mesh(geo, mat);
          m.position.z = z || 0;
          g.add(m);
          return m;
        };
        add(bodyGeo, bodyM());
        add(bezelGeo, new THREE.MeshBasicMaterial({ color: 0x050607 }), 0.0615);
        add(
          frameGeo,
          new THREE.MeshPhongMaterial({
            color: 0x767d86,
            specular: 0x9ba2ad,
            shininess: 65,
          }),
          0.062,
        );
        const scr = add(
          screenGeo,
          new THREE.MeshBasicMaterial({ map: tex(q), transparent: true }),
          0.0635,
        );
        add(
          holeGeo,
          new THREE.MeshBasicMaterial({ color: 0 }),
          0.0655,
        ).position.y = PH / 2 - 0.072;
        gs.add(g);
        const hit = new THREE.Mesh(
          new THREE.PlaneGeometry(1.6, 3.1),
          new THREE.MeshBasicMaterial({ visible: false }),
        );
        hit.userData.i = i;
        gs.add(hit);
        return {
          g,
          scr,
          hit,
          c: { x: (i - 1) * 2.3, y: -0.4, z: -1, ry: 0, s: 0.9, dim: 1 },
          t: null,
        };
      });
      let hov = -1,
        lw = 0,
        lh = 0,
        vis = false,
        tIn = 0,
        gx = 0,
        gy = 0,
        galleryFrameKey = "";
      const gray = new THREE.Raycaster();
      function setT() {
        const narrow = gc.aspect < 1.15,
          availableWidth =
            2 *
            8.6 *
            Math.tan(THREE.MathUtils.degToRad(gc.fov / 2)) *
            gc.aspect,
          fit = narrow
            ? Math.min(
                1,
                Math.max(
                  0.1,
                  (availableWidth - 0.2) / (3 + 1.12 * (PW + 0.04)),
                ),
              )
            : 1,
          sp = narrow ? 1.5 * fit : 2.35,
          base = narrow ? 1.12 * fit : 1.5;
        items.forEach((it, i) => {
          const off = i - 1;
          it.hit.position.set(off * sp, 0, 0);
          it.hit.scale.setScalar(base / 1.5);
          if (hov < 0)
            it.t = {
              x: off * sp,
              y: off === 0 ? 0.1 : -0.05,
              z: off === 0 ? 0.5 : -0.2,
              ry: -off * 0.32,
              s: base,
              dim: 1,
            };
          else if (hov === i)
            it.t = {
              x: 0,
              y: 0.05,
              z: narrow ? 1.6 : 2.3,
              ry: 0,
              s: base * 1.1,
              dim: 1,
            };
          else {
            // Keep the other two screens in separate slots, never intersecting.
            const side = i === (hov === 0 ? 1 : 0) ? -1 : 1;
            it.t = {
              x: side * sp * (narrow ? 1.15 : 1.5),
              y: -0.25,
              z: -1.6,
              ry: -side * 0.45,
              s: base * 0.85,
              dim: 0.38,
            };
          }
        });
        cv.style.cursor = hov >= 0 ? "pointer" : "default";
        root.dataset.galleryIndex = String(hov);
      }
      function pick(e) {
        const r = cv.getBoundingClientRect();
        gx = ((e.clientX - r.left) / r.width) * 2 - 1;
        gy = -((e.clientY - r.top) / r.height) * 2 + 1;
        gray.setFromCamera(new THREE.Vector2(gx, gy), gc);
        gs.updateMatrixWorld(true);
        const h = gray.intersectObjects(
          items.map((it) => it.hit),
          false,
        )[0];
        return h ? h.object.userData.i : -1;
      }
      listen(cv, "pointermove", (e) => {
        if (e.pointerType === "touch") return;
        const n = pick(e);
        if (n !== hov) {
          hov = n;
          setT();
        }
      });
      listen(cv, "pointerleave", (e) => {
        if (e.pointerType === "touch") return;
        hov = -1;
        setT();
      });
      listen(cv, "pointerdown", (e) => {
        if (e.pointerType !== "touch") return;
        const n = pick(e);
        hov = n === hov ? -1 : n;
        setT();
      });
      observe(
        (es) => {
          vis = es[0].isIntersecting;
          if (vis && !tIn) tIn = performance.now();
        },
        { threshold: 0.15 },
      ).observe(gal);
      listen(cv, "keydown", (event) => {
        if (
          !["ArrowLeft", "ArrowRight", "Home", "End", "Escape"].includes(
            event.key,
          )
        )
          return;
        event.preventDefault();
        if (event.key === "Escape") hov = -1;
        else if (event.key === "Home") hov = 0;
        else if (event.key === "End") hov = 2;
        else
          hov = (Math.max(0, hov) + (event.key === "ArrowRight" ? 1 : 2)) % 3;
        setT();
      });
      function frameG(now) {
        requestAnimationFrame(frameG);
        if (!vis || root.ownerDocument.hidden) return;
        const w = cv.clientWidth,
          h = cv.clientHeight;
        const key = `${w}:${h}:${hov}:${gx}:${gy}`;
        if (reduce && galleryFrameKey === key) return;
        galleryFrameKey = key;
        if (w !== lw || h !== lh) {
          lw = w;
          lh = h;
          gr.setSize(w, h, false);
          gc.aspect = w / h;
          gc.updateProjectionMatrix();
          setT();
        }
        const tt = now / 1000,
          e = reduce ? 1 : 1 - Math.pow(1 - clamp((now - tIn) / 1500, 0, 1), 3),
          off = 1 - e;
        items.forEach((it, i) => {
          const c = it.c,
            T = it.t;
          ["x", "y", "z", "ry", "s", "dim"].forEach((k) => {
            c[k] = reduce ? T[k] : c[k] + (T[k] - c[k]) * 0.11;
          });
          it.g.position.set(
            c.x,
            c.y - off * 3 + (reduce ? 0 : Math.sin(tt * 1.1 + i * 1.7) * 0.05),
            c.z,
          );
          it.g.scale.setScalar(c.s);
          it.g.rotation.set(
            hov === i ? -gy * 0.18 : 0,
            c.ry + (hov === i ? gx * 0.35 : 0) + off * off * 1.6,
            0,
          );
          it.scr.material.color.setScalar(c.dim);
        });
        gc.updateMatrixWorld(true);
        root.dataset.galleryLayout = JSON.stringify({
          width: w,
          height: h,
          index: hov,
          phones: items.map((it) => projectedBounds(it.g, gc, w, h)),
        });
        gr.render(gs, gc);
      }
      requestAnimationFrame(frameG);
    })();

    /* scroll */
    const story = document.getElementById("story");
    const panels = [...document.querySelectorAll(".p")];
    const dotsEl = document.getElementById("dots"),
      cue = document.getElementById("cue");
    const sEnd = () => Math.max(1, story.offsetHeight - innerHeight);
    const dots = [...dotsEl.querySelectorAll("button")];
    dots.forEach((button, i) =>
      listen(button, "click", () =>
        scrollTo({
          top: (i / sceneLast) * sEnd(),
          behavior: reduce ? "auto" : "smooth",
        }),
      ),
    );
    let target = 0,
      prog = 0,
      over = 0;
    function onScroll() {
      target = clamp(scrollY / sEnd(), 0, 1);
      over = Math.max(0, scrollY - sEnd());
      touchedPhone = -1;
      clearPointer();
    }
    addEventListener("resize", onScroll);
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    let mx = 0,
      my = 0;
    addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch") return;
      if (e.target !== canvas) {
        clearPointer();
        return;
      }
      setPointer(e);
      mx = ptr.x / 2;
      my = -ptr.y / 2;
      testBtn();
      if (!hoverEl) testPhonePointer();
      else hoveredPhone = -1;
      staticFrameKey = "";
    });
    function projectedBounds(object, camera = cam, width = W, height = Hh) {
      object.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(object);
      const corners = [];
      for (const x of [box.min.x, box.max.x])
        for (const y of [box.min.y, box.max.y])
          for (const z of [box.min.z, box.max.z]) {
            const v = new THREE.Vector3(x, y, z).project(camera);
            corners.push({
              x: ((v.x + 1) * width) / 2,
              y: ((1 - v.y) * height) / 2,
            });
          }
      const left = Math.min(...corners.map((p) => p.x));
      const top = Math.min(...corners.map((p) => p.y));
      return {
        x: left,
        y: top,
        width: Math.max(...corners.map((p) => p.x)) - left,
        height: Math.max(...corners.map((p) => p.y)) - top,
      };
    }
    drawScreen(0);
    paintReel(previewCtx, 0);
    previewTex.needsUpdate = true;
    const t0 = performance.now();
    function tick(now) {
      requestAnimationFrame(tick);
      if (root.ownerDocument.hidden) return;
      // A static reduced-motion scene only needs repainting after an interaction.
      const nextStaticKey = `${W}:${Hh}:${target}:${over}:${mx}:${my}:${pointerValid}:${hoveredPhone}:${touchedPhone}:${demoRevision}`;
      if (reduce && staticFrameKey === nextStaticKey) return;
      staticFrameKey = nextStaticKey;
      const t = reduce ? 5 : (now - t0) / 1000;
      prog = reduce ? target : prog + (target - prog) * 0.075;
      const f = clamp(prog * sceneLast, 0, sceneLast),
        i0 = Math.min(sceneLast - 1, Math.floor(f)),
        tt = sm(f - i0);
      const fade = clamp(1 - over / (Hh * 0.35), 0, 1);
      panels.forEach((p, i) =>
        dots[i].classList.toggle("on", Math.round(f) === i),
      );
      dotsEl.style.opacity = fade;
      dotsEl.style.pointerEvents = fade > 0.08 ? "" : "none";
      dots.forEach((dot) => {
        dot.tabIndex = fade > 0.08 ? 0 : -1;
      });
      cue.style.opacity = clamp(1 - f * 6, 0, 1);
      // A restored scroll position must still allow the first successful render.
      if (over > Hh * 1.1 && root.dataset.sceneState === "ready") return;
      const A = frame(i0),
        B = frame(i0 + 1),
        Lp = (k) => lerp(A[k], B[k], tt);
      const intro = reduce ? 1 : clamp(t / 3.2, 0, 1),
        drop = Math.pow(1 - intro, 3),
        spin = 0;
      cam.position.set(0, 0, Lp("cz"));
      cam.lookAt(0, 0, 0);
      reflectionClip.constant = -Lp("clipY");
      const vw = Lp("vw"),
        vh = Lp("vh");
      const ph = {
        x: Lp("x"),
        y: Lp("y"),
        s: Lp("s"),
        ry: Lp("ry"),
        rx: Lp("rx"),
        d: Lp("d"),
        dx: Lp("dx"),
      };
      const sway = reduce ? 0 : Math.sin(t * 0.6) * 0.025,
        fl = reduce ? 0 : Math.sin(t * 1.1) * Math.min(0.018, ph.s * 0.02),
        py = ph.y + fl + drop * 3;
      const turn = (value, goal) =>
        reduce
          ? goal
          : value +
            Math.atan2(Math.sin(goal - value), Math.cos(goal - value)) * 0.12;
      const facingPrimary =
        hoveredPhone === 0 ||
        touchedPhone === 0 ||
        Boolean(activeDemoLabels[Math.round(f)]);
      const previewScene = Math.round(f) === sceneLast;
      const facingSecondary =
        hoveredPhone === 1 || touchedPhone === 1 || previewScene;
      phoneAngles[0].x = lerp(
        phoneAngles[0].x,
        facingPrimary ? -phonePointerY * 0.065 : ph.rx,
        reduce ? 1 : 0.12,
      );
      phoneAngles[0].y = turn(
        phoneAngles[0].y,
        facingPrimary ? phonePointerX * 0.12 : ph.ry + sway + spin,
      );
      phoneAngles[1].x = lerp(
        phoneAngles[1].x,
        facingSecondary ? -phonePointerY * 0.065 : 0,
        reduce ? 1 : 0.12,
      );
      phoneAngles[1].y = turn(
        phoneAngles[1].y,
        facingSecondary ? phonePointerX * 0.12 : Math.PI + 0.35 - sway * 0.8,
      );
      const floorY = ph.y - 0.99 * ph.s - 0.14;
      phone.position.set(ph.x, py, 0);
      phone.scale.setScalar(ph.s);
      phone.rotation.set(phoneAngles[0].x, phoneAngles[0].y, 0);
      phoneRef.position.set(ph.x, 2 * floorY - py, 0);
      phoneRef.scale.set(ph.s, -ph.s, ph.s);
      phoneRef.rotation.set(-phoneAngles[0].x, phoneAngles[0].y, 0);
      const d2 = sm(clamp(ph.d, 0, 1)),
        s2 = Math.max(0.001, ph.s * 0.95 * d2),
        y2 = floorY + 0.99 * s2,
        p2x = ph.x + ph.dx,
        y2f = y2 + fl * 0.7 + drop * 3;
      phone2.visible = phoneRef2.visible = d2 > 0.02;
      phone2.position.set(p2x, y2f, -0.16);
      phone2.scale.setScalar(s2);
      phone2.rotation.set(phoneAngles[1].x, phoneAngles[1].y, 0);
      phoneRef2.position.set(p2x, 2 * floorY - y2 - fl * 0.7, -0.16);
      phoneRef2.scale.set(s2, -s2, s2);
      phoneRef2.rotation.set(-phoneAngles[1].x, phoneAngles[1].y, 0);
      phonePicks[0].position.set(ph.x, py, 0.25);
      phonePicks[0].scale.setScalar(ph.s);
      phonePicks[0].visible = fade > 0.7 && intro > 0.8;
      phonePicks[1].position.set(p2x, y2f, 0.25);
      phonePicks[1].scale.setScalar(s2);
      phonePicks[1].visible = phonePicks[0].visible && d2 > 0.02;
      floor.position.set(ph.x, floorY, 0);
      floor.scale.set(mobile ? 0.5 : 1, 1, 1);

      const A0 = frame(0),
        brandRegion = sceneLayouts[0].brand,
        brandWidth = Math.min(
          brandRegion.width / brandFrac,
          brandRegion.height * 6,
        ),
        bw = brandWidth / ppu,
        bx = (brandRegion.x + brandRegion.width / 2 - W / 2) / ppu,
        by = (Hh / 2 - brandRegion.y - brandRegion.height / 2) / ppu;
      const bA = clamp(1 - f * 2.4, 0, 1) * clamp(t / 2.6, 0, 1),
        bz = -0.4 - f * 2.5,
        bxx = bx + (1 - clamp(t / 2.6, 0, 1)) * -2;
      brand.scale.set(bw / 4, bw / 4, 1);
      brand.position.set(bxx, by, bz);
      brandMat.opacity = Hh < 480 && !mobile ? 0 : bA;
      const bfl = A0.y - 0.99 * A0.s - 0.14;
      brandRef.scale.set(bw / 4, -bw / 4, 1);
      brandRef.position.set(bxx, 2 * bfl - by, bz);
      brandRefMat.opacity = mobile || Hh < 480 ? 0 : bA * 0.6;

      const R = Math.min(3.6, vw * 0.46),
        cx = ph.x * 0.35,
        spread = lerp(0.55, 0.22, clamp(f, 0, 1)),
        ti = reduce ? 1 : clamp(t / 2.6, 0, 1);
      for (let i = 0; i < N; i++) {
        const a = (U[i] + t * SP[i]) * 6.2832,
          k = K[i],
          rad = R * (0.88 + 0.22 * Math.sin(a * 3 + k * 2)) * (0.8 + k * 0.12);
        pos[i * 3] = cx + Math.cos(a) * rad + OFF[i * 3] * spread;
        pos[i * 3 + 1] =
          py * 0.4 +
          Math.sin(a * 2 + k * 2.1) * 0.7 +
          0.1 +
          OFF[i * 3 + 1] * spread * 0.8;
        // Keep the orbit atmospheric: sparks must not wash over real app screens.
        pos[i * 3 + 2] = Math.min(
          -0.5,
          Math.sin(a) * rad * 0.5 - 0.8 + OFF[i * 3 + 2] * spread,
        );
      }
      pg.attributes.position.needsUpdate = true;
      pm.opacity = ti * 0.62;
      pm.size = mobile ? 0.06 : 0.07;
      pl1.position.x = -3 + ph.x * 0.3;
      pl2.position.x = 3 + ph.x * 0.3;
      const si = Math.round(f);
      activeDemoScene = si;
      root.dataset.sceneIndex = String(si);
      paintReel(previewCtx, t);
      previewTex.needsUpdate = true;
      const shortPhone = mobile && Hh < 640;
      const requestedScreen =
        si === sceneLast && shortPhone ? `reel:${Math.floor(t / 2.2)}` : screenKey(si);
      if (requestedScreen !== paintedScreen) {
        paintedScreen = requestedScreen;
        if (si === sceneLast && shortPhone) {
          paintReel(c, t);
          screenTex.needsUpdate = true;
        } else drawScreen(si);
      }
      updatePanels(f, t, fade, reduce ? 1 : clamp((t - 1.2) / 1.6, 0, 1));
      updateDemoStatus(si);
      const key = `${si}:${W}:${Hh}:${demoRevision}:${hoveredPhone}:${touchedPhone}:${phoneAngles.map((a) => `${a.x.toFixed(2)},${a.y.toFixed(2)}`).join(":")}`;
      const settled = Math.abs(f - si) < 0.05;
      const resized = Boolean(boundsKey) && !boundsKey.startsWith(`${si}:${W}:${Hh}:`);
      if (intro === 1 && boundsKey !== key && (settled || resized)) {
        cam.updateMatrixWorld();
        root.dataset.sceneLayout = JSON.stringify({
          index: si,
          viewport: { width: W, height: Hh },
          ...sceneLayouts[si],
          models: [phone, ...(phone2.visible ? [phone2] : [])].map((model) =>
            projectedBounds(model),
          ),
          frameBounds: projectedBounds(
            panelObjs[si].els.find((e) => e.kind === "stage").mesh,
          ),
          cardBounds: panelObjs[si].els.some((e) => e.kind === "card")
            ? projectedBounds(
                panelObjs[si].els.find((e) => e.kind === "card").mesh,
              )
            : null,
          buttons: panelObjs[si].els
            .filter((e) => e.kind === "btn")
            .map((e) => ({ href: e.href, ...projectedBounds(e.mesh) })),
          chips: panelObjs[si].els
            .filter((e) => e.kind === "chip")
            .map((e) => ({
              label: e.label,
              available: Boolean(e.demo?.available),
              selected: e.selected,
              ...projectedBounds(e.mesh),
            })),
          textBounds: panelObjs[si].els
            .filter((e) => e.kind === "word" || e.kind === "line")
            .map((e) => projectedBounds(e.mesh)),
          phoneRotations: phoneAngles.map((a) => ({ ...a })),
          hoverPhone: hoveredPhone,
          screen: requestedScreen,
        });
        boundsKey = key;
      }
      renderer.render(scene, cam);
      runtime.markReady();
    }
    requestAnimationFrame(tick);
  }
  initialize().catch(runtime.fallback);
  return runtime.dispose;
}
