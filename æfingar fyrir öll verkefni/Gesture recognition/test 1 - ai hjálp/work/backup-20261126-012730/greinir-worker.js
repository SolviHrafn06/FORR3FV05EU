// Handarakning í sér þræði svo 3D teikningin bíði aldrei eftir MediaPipe (20–35 ms á ramma).
// Klassískur worker (ekki type:'module'): MediaPipe hleður wasm með importScripts, sem module-worker hefur ekki.
let greinir = null;

onmessage = async (e) => {
  const d = e.data;
  if (d.init) {
    try {
      const { GestureRecognizer, FilesetResolver } = await import(d.mpModul);
      const vision = await FilesetResolver.forVisionTasks(d.mpWasm);
      for (const delegate of ['GPU', 'CPU']) {
        try {
          greinir = await GestureRecognizer.createFromOptions(vision, { ...d.valkostir, baseOptions: { modelAssetPath: d.likan, delegate } });
          postMessage({ tilbuinn: delegate });
          return;
        } catch (err) {
          console.warn(`worker: delegate ${delegate} tókst ekki`, err);
        }
      }
      postMessage({ villa: 'Gat ekki búið til GestureRecognizer' });
    } catch (err) {
      postMessage({ villa: String(err?.message || err) });
    }
    return;
  }
  // rammi: d.bmp (ImageBitmap, minnkaður), d.t (tími rammans í ms)
  const t0 = performance.now();
  try {
    const r = greinir.recognizeForVideo(d.bmp, d.t);
    postMessage({ t: d.t, ms: performance.now() - t0, r: { landmarks: r.landmarks, worldLandmarks: r.worldLandmarks, gestures: r.gestures } });
  } catch (err) {
    postMessage({ t: d.t, ms: 0, r: null, villa: String(err?.message || err) });
  } finally {
    d.bmp.close();
  }
};
