(() => {
  const channel = new BroadcastChannel('neopresent-surface-camera');
  const cameras = new WeakMap();
  const presenterById = new Map();
  const viewerById = new Map();
  const presenter = Boolean(document.querySelector('#current-preview'));
  let drag;

  const vertices = (value) => value.split(';').map((vertex) => vertex.split(',').map(Number));
  const initialCamera = (surface) => ({
    azimuth: Number(surface.dataset.surfaceAzimuth) || 45,
    elevation: Number(surface.dataset.surfaceElevation) || 28,
    zoom: Number(surface.dataset.surfaceZoom) || 1
  });
  const cameraFor = (surface) => {
    if (!cameras.has(surface)) {
      const surfaceId = surface.dataset.surfaceId;
      const synchronized = presenter
        ? presenterById.get(surfaceId)
        : (viewerById.get(surfaceId) ?? presenterById.get(surfaceId));
      cameras.set(surface, synchronized ? { ...synchronized } : initialCamera(surface));
    }
    return cameras.get(surface);
  };
  const displayedCamera = (surface) => {
    const azimuth = Number(surface.dataset.surfaceCurrentAzimuth);
    const elevation = Number(surface.dataset.surfaceCurrentElevation);
    const zoom = Number(surface.dataset.surfaceCurrentZoom);
    return Number.isFinite(azimuth) && Number.isFinite(elevation) && Number.isFinite(zoom)
      ? { azimuth, elevation, zoom }
      : { ...cameraFor(surface) };
  };
  const project = ([x, y, z], camera) => {
    const angle = (camera.azimuth * Math.PI) / 180;
    const tilt = (camera.elevation * Math.PI) / 180;
    const centeredX = x - 0.5,
      centeredY = y - 0.5;
    const horizontal = centeredX * Math.cos(angle) - centeredY * Math.sin(angle);
    const depth = centeredX * Math.sin(angle) + centeredY * Math.cos(angle);
    return {
      depth,
      x: 350 + horizontal * 430,
      y: 320 + depth * Math.sin(tilt) * 260 - z * Math.cos(tilt) * 270
    };
  };

  function finishDrawAnimation(surface) {
    const group = surface.querySelector('[data-neopresent-surface-faces]');
    if (
      group?.dataset.surfaceAnimation !== 'draw' ||
      group.dataset.surfaceAnimationSettled === 'true'
    )
      return;
    group.querySelectorAll('[data-neopresent-surface-vertices]').forEach((face) => {
      face.style.animation = 'none';
      face.style.opacity = '1';
    });
    group.dataset.surfaceAnimationSettled = 'true';
  }

  function redraw(surface, camera) {
    cameras.set(surface, { ...camera });
    surface.dataset.surfaceCameraSignature = `${camera.azimuth}:${camera.elevation}:${camera.zoom}`;
    surface.dataset.surfaceCurrentAzimuth = String(camera.azimuth);
    surface.dataset.surfaceCurrentElevation = String(camera.elevation);
    surface.dataset.surfaceCurrentZoom = String(camera.zoom);
    surface
      .querySelector('[data-neopresent-surface-scene]')
      ?.setAttribute('transform', `translate(350 235) scale(${camera.zoom}) translate(-350 -235)`);
    const faces = [...surface.querySelectorAll('[data-neopresent-surface-vertices]')];
    for (const face of faces) {
      const points = vertices(face.dataset.neopresentSurfaceVertices).map((vertex) =>
        project(vertex, camera)
      );
      face.setAttribute('points', points.map((point) => `${point.x},${point.y}`).join(' '));
      face.dataset.surfaceDepth = String(
        points.reduce((sum, point) => sum + point.depth, 0) / points.length
      );
    }
    const group = surface.querySelector('[data-neopresent-surface-faces]');
    faces
      .sort((a, b) => Number(b.dataset.surfaceDepth) - Number(a.dataset.surfaceDepth))
      .forEach((face) => group?.append(face));
    surface.querySelectorAll('[data-neopresent-surface-edge]').forEach((edge) => {
      const [start, end] = vertices(edge.dataset.neopresentSurfaceEdge).map((vertex) =>
        project(vertex, camera)
      );
      edge.setAttribute('d', `M ${start.x} ${start.y} L ${end.x} ${end.y}`);
    });
    surface.querySelectorAll('[data-neopresent-surface-label]').forEach((label) => {
      const point = project(label.dataset.neopresentSurfaceLabel.split(',').map(Number), camera);
      label.setAttribute(
        'transform',
        `translate(${point.x - Number(label.dataset.surfaceLabelX)} ${point.y - Number(label.dataset.surfaceLabelY)})`
      );
    });
  }

  function publish(surface) {
    const camera = cameraFor(surface);
    const message = { type: 'surface-camera', surfaceId: surface.dataset.surfaceId, ...camera };
    presenterById.set(message.surfaceId, message);
    channel.postMessage(message);
  }

  function surfaceFrom(target) {
    const surface = target instanceof Element ? target.closest('[data-neopresent-surface]') : null;
    return surface?.dataset.surfaceInteractive === 'true' ? surface : null;
  }

  function applyInteraction(surface, camera) {
    // Face depth sorting moves polygons in the DOM. Complete a one-time draw
    // entrance only for a real camera interaction, not for slide restoration.
    finishDrawAnimation(surface);
    if (presenter) {
      redraw(surface, camera);
      publish(surface);
      return;
    }
    const localCamera = {
      type: 'surface-camera',
      surfaceId: surface.dataset.surfaceId,
      ...camera
    };
    viewerById.set(surface.dataset.surfaceId, localCamera);
    redraw(surface, localCamera);
  }

  document.addEventListener('pointerdown', (event) => {
    const surface = surfaceFrom(event.target);
    if (!surface) return;
    event.preventDefault();
    drag = { surface, pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    surface.setPointerCapture?.(event.pointerId);
    surface.style.cursor = 'grabbing';
  });
  document.addEventListener('pointermove', (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const camera = displayedCamera(drag.surface);
    camera.azimuth += (event.clientX - drag.x) * 0.45;
    camera.elevation = Math.max(
      -10,
      Math.min(85, camera.elevation - (event.clientY - drag.y) * 0.35)
    );
    drag.x = event.clientX;
    drag.y = event.clientY;
    applyInteraction(drag.surface, camera);
  });
  const endDrag = (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.surface.style.cursor = 'grab';
    drag = null;
  };
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);
  document.addEventListener('dblclick', (event) => {
    const surface = surfaceFrom(event.target);
    if (!surface) return;
    applyInteraction(surface, initialCamera(surface));
  });

  window.addEventListener('neopresent-surface-wheel', (event) => {
    const { deltaY, surface } = event.detail;
    if (!surface?.isConnected) return;
    // Zoom from the camera which is visibly rendered in this viewer, not from
    // the latest presenter/default cache.
    const camera = displayedCamera(surface);
    camera.zoom = Math.max(0.45, Math.min(2.5, camera.zoom * Math.exp(-deltaY * 0.001)));
    applyInteraction(surface, camera);
  });

  function applyLatest(root = document) {
    root.querySelectorAll?.('[data-neopresent-surface]').forEach((surface) => {
      const surfaceId = surface.dataset.surfaceId;
      const camera = presenter
        ? presenterById.get(surfaceId)
        : (viewerById.get(surfaceId) ?? presenterById.get(surfaceId));
      const signature = camera ? `${camera.azimuth}:${camera.elevation}:${camera.zoom}` : '';
      if (camera && surface.dataset.surfaceCameraSignature !== signature) redraw(surface, camera);
    });
  }

  channel.addEventListener('message', (event) => {
    if (event.data?.type !== 'surface-camera' || !event.data.surfaceId) return;
    presenterById.set(event.data.surfaceId, event.data);
    // A real presenter interaction deliberately takes control of the audience.
    viewerById.delete(event.data.surfaceId);
    document.querySelectorAll?.('[data-neopresent-surface]').forEach((surface) => {
      if (surface.dataset.surfaceId === event.data.surfaceId) finishDrawAnimation(surface);
    });
    applyLatest();
  });
  new MutationObserver(() => applyLatest()).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
