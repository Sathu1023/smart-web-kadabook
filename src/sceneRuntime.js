// Owns browser/GPU resources for the scroll animation during one React mount.
// Scene refinements share this lifecycle so fallback, resize and cleanup stay safe.
export function createSceneRuntime(root) {
  const ownerDocument = root.ownerDocument;
  const view = ownerDocument.defaultView;
  const frameIds = new Set();
  const timerIds = new Set();
  const observers = new Set();
  const scenes = new Set();
  const renderers = new Set();
  const removers = [];
  const pendingImages = new Set();
  const initialClasses = new Map(
    ["gl3d", "nogl", "mob"].map((name) => [
      name,
      ownerDocument.body.classList.contains(name),
    ]),
  );
  let disposed = false;
  let failed = false;
  let ready = false;
  root.dataset.sceneState = "loading";

  // Query inside this React tree, not unrelated elements elsewhere in the page.
  const document = {
    body: ownerDocument.body,
    fonts: ownerDocument.fonts,
    createElement: ownerDocument.createElement.bind(ownerDocument),
    querySelector: (selector) => root.querySelector(selector),
    querySelectorAll: (selector) => root.querySelectorAll(selector),
    getElementById: (id) => root.querySelector(`[id="${id}"]`),
  };

  function listen(target, type, listener, options) {
    if (disposed || !target) return;
    target.addEventListener(type, listener, options);
    removers.push(() => target.removeEventListener(type, listener, options));
  }

  function requestAnimationFrame(callback) {
    if (disposed || failed) return 0;
    const id = view.requestAnimationFrame((now) => {
      frameIds.delete(id);
      if (disposed || failed) return;
      try {
        callback(now);
      } catch (error) {
        fallback(error);
      }
    });
    frameIds.add(id);
    return id;
  }

  function setTimeout(callback, delay) {
    if (disposed) return 0;
    const id = view.setTimeout(() => {
      timerIds.delete(id);
      if (!disposed && !failed) callback();
    }, delay);
    timerIds.add(id);
    return id;
  }

  function clearTimeout(id) {
    view.clearTimeout(id);
    timerIds.delete(id);
  }

  function observe(callback, options) {
    if (!view.IntersectionObserver) {
      return {
        observe: (element) =>
          callback([{ target: element, isIntersecting: true }]),
        unobserve() {},
        disconnect() {},
      };
    }
    const observer = new view.IntersectionObserver((entries) => {
      if (!disposed) callback(entries);
    }, options);
    observers.add(observer);
    return observer;
  }

  function keepRenderer(renderer) {
    renderers.add(renderer);
    listen(renderer.domElement, "webglcontextlost", (event) => {
      event.preventDefault();
      fallback(new Error("WebGL context lost"));
    });
    return renderer;
  }

  function keepScene(scene) {
    scenes.add(scene);
    return scene;
  }

  function releaseGraphics() {
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    scenes.forEach((scene) =>
      scene.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) {
          (Array.isArray(object.material)
            ? object.material
            : [object.material]
          ).forEach((material) => {
            materials.add(material);
            Object.values(material).forEach((value) => {
              if (value?.isTexture) textures.add(value);
            });
          });
        }
      }),
    );
    textures.forEach((texture) => texture.dispose());
    materials.forEach((material) => material.dispose());
    geometries.forEach((geometry) => geometry.dispose());
    scenes.forEach((scene) => scene.clear());
    scenes.clear();
    renderers.forEach((renderer) => renderer.dispose());
    renderers.clear();
  }

  function stopFrames() {
    frameIds.forEach((id) => view.cancelAnimationFrame(id));
    frameIds.clear();
    timerIds.forEach((id) => view.clearTimeout(id));
    timerIds.clear();
  }

  function stopListeners() {
    observers.forEach((observer) => observer.disconnect());
    observers.clear();
    removers.splice(0).forEach((remove) => remove());
    pendingImages.forEach((cancel) => cancel());
    pendingImages.clear();
  }

  function restoreInitialAnchor() {
    // The hash target does not exist until React has mounted its content.
    const target = ownerDocument.getElementById(view.location.hash.slice(1));
    if (target && root.contains(target))
      target.scrollIntoView({ behavior: "instant" });
  }

  function fallback(error) {
    if (disposed || failed) return;
    failed = true;
    stopFrames();
    stopListeners();
    ownerDocument.body.classList.remove("gl3d");
    ownerDocument.body.classList.add("nogl");
    root.querySelector("#gal")?.classList.add("fb");
    root
      .querySelectorAll(".rv")
      .forEach((element) => element.classList.add("in"));
    root.dataset.sceneState = "fallback";
    if (error)
      console.warn(
        "KadaBook: displaying the original static fallback.",
        error.message,
      );
    releaseGraphics();
    if (!ready) restoreInitialAnchor();
  }

  function markReady() {
    if (disposed || failed || ready) return;
    ready = true;
    ownerDocument.body.classList.remove("nogl");
    ownerDocument.body.classList.add("gl3d");
    root.dataset.sceneState = "ready";
    restoreInitialAnchor();
  }

  async function loadImages(images) {
    const loaded = {};
    await Promise.all(
      Object.entries(images).map(
        ([key, source]) =>
          new Promise((resolve, reject) => {
            const image = new Image();
            const cancel = () => {
              image.onload = null;
              image.onerror = null;
              resolve();
            };
            pendingImages.add(cancel);
            image.onload = () => {
              image.onload = null;
              image.onerror = null;
              pendingImages.delete(cancel);
              loaded[key] = image;
              resolve();
            };
            image.onerror = () => {
              pendingImages.delete(cancel);
              image.onload = null;
              image.onerror = null;
              reject(new Error(`Unable to load the ${key} screenshot`));
            };
            image.src = source;
          }),
      ),
    );
    return loaded;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    stopFrames();
    stopListeners();
    releaseGraphics();
    initialClasses.forEach((present, name) =>
      ownerDocument.body.classList.toggle(name, present),
    );
    root.querySelector("#gal")?.classList.remove("fb");
    root.querySelectorAll("canvas").forEach((canvas) => {
      canvas.style.cursor = "";
    });
    root.querySelectorAll("#dots, #cue").forEach((element) => {
      element.style.opacity = "";
      element.style.pointerEvents = "";
    });
    root.querySelectorAll(".dots button").forEach((button) => {
      button.classList.remove("on");
      button.removeAttribute("tabindex");
    });
    delete root.dataset.sceneControls;
    delete root.dataset.controlHover;
    delete root.dataset.sceneState;
    delete root.dataset.sceneIndex;
    delete root.dataset.sceneLayout;
    delete root.dataset.galleryIndex;
    delete root.dataset.galleryLayout;
    delete root.dataset.sceneDemo;
    delete root.dataset.phoneHover;
    root
      .querySelectorAll("[data-demo-chip]")
      .forEach((button) => button.setAttribute("aria-pressed", "false"));
    root
      .querySelectorAll(".motion-visible")
      .forEach((element) => element.classList.remove("motion-visible"));
  }

  return {
    document,
    listen,
    observe,
    keepRenderer,
    keepScene,
    markReady,
    fallback,
    loadImages,
    dispose,
    requestAnimationFrame,
    setTimeout,
    clearTimeout,
    addEventListener: (type, listener, options) =>
      listen(view, type, listener, options),
    get disposed() {
      return disposed;
    },
  };
}
