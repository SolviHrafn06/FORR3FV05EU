// =============================================================
//  input.js – Snertistjórnun með Pointer Events
// -------------------------------------------------------------
//  Touch Events eru EKKI notuð. Pointer Events virka eins fyrir
//  fingur, penna og mús, og hver fingur fær sitt eigið pointerId.
//
//  Við geymum alla virka fingur í Map (pointerId → upplýsingar).
//  Þannig getum við höndlað marga fingur í einu (MULTI-TOUCH):
//    - tvö börn / tveir fingur geta dregið tvo bita samtímis
//    - einn fingur heldur á bita og annar fingur snýr honum
//
//  Bendingar (gestures) sem eru greindar hér:
//    press  → fingur á bita, bíður eftir LONG PRESS (tímabundin bending)
//    drag   → bitanum hefur verið lyft og hann er dreginn (PAN)
//    rotate → annar fingur sem snýr bita sem verið er að draga
//    lock   → haldið inni á lásnum í 2 sek (TÍMABUNDIN bending)
//    swipe  → strokið yfir skjáinn til að fara á næsta borð (SWIPE)
// =============================================================

export const PRESS_MS = 300;    // hve lengi þarf að halda á bita áður en hann lyftist
export const LOCK_MS = 2000;    // hve lengi þarf að halda á lásnum
const MOVE_TOLERANCE = 16;      // px – hve mikið fingur má hreyfast á meðan haldið er inni
const SWIPE_MIN_DIST = 90;      // px – lágmarkslengd stroku
const SWIPE_MAX_TIME = 900;     // ms – hámarkstími stroku

/**
 * @param {SVGSVGElement} svgEl
 * @param {object} h  – föll í main.js sem bregðast við bendingunum
 */
export function setupInput(svgEl, h) {
  /** Allir fingur sem eru á skjánum núna: pointerId → pointer-hlutur */
  const pointers = new Map();
  /** Bitar sem verið er að halda á: piece → { anchor, rot, baseAngle, baseRot, accum, last } */
  const holders = new Map();

  /** Breytir skjáhnitum (clientX/Y) í SVG-hnit (viewBox) */
  const toSvg = (e) => {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svgEl.getScreenCTM().inverse());
    return { x: p.x, y: p.y };
  };

  const angleDeg = (a, b) => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;

  // ---------------------------------------------------------
  //  pointerdown – nýr fingur snertir skjáinn
  // ---------------------------------------------------------
  svgEl.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const pos = toSvg(e);
    const p = {
      id: e.pointerId,
      kind: 'none',
      pos,
      start: pos,
      sx: e.clientX, sy: e.clientY,          // upphafsstaða í skjá-px (fyrir þolmörk og stroku)
      t0: performance.now(),
      piece: null,
      timer: null,
    };
    pointers.set(e.pointerId, p);

    // Pointer capture: þessi fingur heldur áfram að senda atburði til SVG-sins
    // jafnvel þótt hann fari út fyrir bitann eða skjáinn.
    try { svgEl.setPointerCapture(e.pointerId); } catch (_) { /* t.d. gervi-atburðir */ }

    h.onAnyDown(pos);

    const lockEl = e.target.closest('#lock');
    const nextEl = e.target.closest('#next');
    const pieceEl = e.target.closest('[data-piece]');

    if (lockEl) {
      // ---- LÁS: halda inni í 2 sekúndur ----
      p.kind = 'lock';
      h.onLockStart(LOCK_MS);
      p.timer = setTimeout(() => {
        p.kind = 'none';
        h.onLockComplete();
      }, LOCK_MS);
      return;
    }

    if (pieceEl) {
      const piece = h.getPiece(pieceEl.dataset.piece);
      const holder = holders.get(piece);

      if (!h.canGrab(piece)) {
        p.kind = 'tap';
        p.piece = piece;
      } else if (holder) {
        // Annar fingur á bita sem þegar er haldið á → hann snýr bitanum
        if (!holder.rot) attachRotation(holder, p);
      } else if ([...pointers.values()].some((o) => o !== p && o.kind === 'press' && o.piece === piece)) {
        // Annar fingur er þegar að "halda inni" á þessum bita – hunsa
      } else {
        // ---- LONG PRESS: bíðum í PRESS_MS áður en bitinn lyftist ----
        p.kind = 'press';
        p.piece = piece;
        h.onPressStart(piece, pos, PRESS_MS);
        p.timer = setTimeout(() => lift(p), PRESS_MS);
      }
      return;
    }

    // Fingur á auðu svæði. Ef verið er að draga bita (og enginn snýr honum)
    // verður þessi fingur að "snúningsfingri" fyrir hann.
    const free = [...holders.values()].reverse().find((hd) => !hd.rot);
    if (free) {
      attachRotation(free, p);
      return;
    }

    // Annars gæti þetta verið stroka (swipe) – eða bank á örina
    p.kind = 'swipe';
    p.onNext = !!nextEl;
  });

  // ---------------------------------------------------------
  //  pointermove – fingur hreyfist
  // ---------------------------------------------------------
  svgEl.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    p.pos = toSvg(e);

    switch (p.kind) {
      case 'press': {
        // Of mikil hreyfing áður en tíminn er liðinn → hætt við
        const moved = Math.hypot(e.clientX - p.sx, e.clientY - p.sy);
        if (moved > MOVE_TOLERANCE) {
          clearTimeout(p.timer);
          h.onPressCancel(p.piece, true);
          p.kind = 'none';
        }
        break;
      }
      case 'drag': {
        const holder = holders.get(p.piece);
        h.onDrag(p.piece, p.pos);
        if (holder && holder.rot) updateRotation(holder);
        break;
      }
      case 'rotate':
        updateRotation(p.holder);
        break;
    }
  });

  // ---------------------------------------------------------
  //  pointerup / pointercancel – fingri lyft (eða vafrinn hætti við)
  // ---------------------------------------------------------
  const end = (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    pointers.delete(e.pointerId);
    clearTimeout(p.timer);
    const cancelled = e.type === 'pointercancel';
    const pos = cancelled ? p.pos : toSvg(e);

    h.onAnyUp(pos, p.kind);

    switch (p.kind) {
      case 'press':
        // Sleppt áður en bitinn lyftist = venjulegt bank
        h.onPressCancel(p.piece, false);
        if (!cancelled) h.onTap(p.piece);
        break;

      case 'tap':
        if (!cancelled) h.onTap(p.piece);
        break;

      case 'drag': {
        const holder = holders.get(p.piece);
        holders.delete(p.piece);
        if (holder && holder.rot) holder.rot.kind = 'none';   // snúningsfingurinn er laus
        h.onDrop(p.piece);
        break;
      }

      case 'rotate': {
        const holder = p.holder;
        if (holders.get(holder.piece) === holder) {
          holder.rot = null;
          h.onRotateEnd(holder.piece);
        }
        break;
      }

      case 'lock':
        h.onLockCancel();
        break;

      case 'swipe': {
        if (cancelled) break;
        const dx = e.clientX - p.sx;
        const dy = e.clientY - p.sy;
        const dt = performance.now() - p.t0;
        if (Math.abs(dx) > SWIPE_MIN_DIST && Math.abs(dx) > Math.abs(dy) * 1.3 && dt < SWIPE_MAX_TIME) {
          h.onSwipe(Math.sign(dx));
        } else if (p.onNext && Math.hypot(dx, dy) < MOVE_TOLERANCE) {
          h.onNextTap();
        }
        break;
      }
    }
  };
  svgEl.addEventListener('pointerup', end);
  svgEl.addEventListener('pointercancel', end);

  // ---------------------------------------------------------
  //  Hjálparföll
  // ---------------------------------------------------------

  /** Tíminn er liðinn og fingurinn er enn á bitanum → lyfta honum */
  function lift(p) {
    if (p.kind !== 'press') return;
    p.kind = 'drag';
    holders.set(p.piece, { piece: p.piece, anchor: p, rot: null });
    h.onLift(p.piece, p.pos);
  }

  /** Tengir annan fingur við bita sem er haldið á, til að snúa honum */
  function attachRotation(holder, p) {
    p.kind = 'rotate';
    p.holder = holder;
    holder.rot = p;
    holder.baseRot = h.getRotation(holder.piece);
    holder.last = angleDeg(holder.anchor.pos, p.pos);
    holder.accum = 0;
    h.onRotateStart(holder.piece);
  }

  /**
   * Hornið á línunni á milli fingranna tveggja segir til um snúninginn.
   * Við leggjum saman litlar breytingar (accum) svo það verði ekki
   * stökk þegar hornið fer yfir ±180°.
   */
  function updateRotation(holder) {
    const a = angleDeg(holder.anchor.pos, holder.rot.pos);
    let delta = a - holder.last;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    holder.accum += delta;
    holder.last = a;
    h.onRotate(holder.piece, holder.baseRot + holder.accum);
  }

  // Langt þrýst opnar annars valmynd (iOS/Android) – bönnum það
  svgEl.addEventListener('contextmenu', (e) => e.preventDefault());
  // Safari: kemur í veg fyrir aðdrátt með tveimur fingrum
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  // Fyrir prófanir á tölvu án snertiskjás: músarhjól snýr bita um 90°
  let lastWheel = 0;
  svgEl.addEventListener('wheel', (e) => {
    e.preventDefault();
    const now = performance.now();
    if (now - lastWheel < 350) return;
    const pieceEl = e.target.closest('[data-piece]');
    if (!pieceEl) return;
    const piece = h.getPiece(pieceEl.dataset.piece);
    if (!h.canGrab(piece)) return;
    lastWheel = now;
    h.onWheelRotate(piece, e.deltaY > 0 ? 90 : -90);
  }, { passive: false });

  return { pointers, holders };
}
