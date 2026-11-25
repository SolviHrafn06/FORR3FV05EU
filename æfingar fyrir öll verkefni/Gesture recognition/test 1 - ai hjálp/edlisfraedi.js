// Árekstrar milli hluta (kúlur). Hreint JS: virkar á { x, y, z } hluti, þar á meðal THREE.Vector3.

/**
 * Leysir árekstur tveggja kúlna. a, b: { p, v, r, kyrr } þar sem kyrr = haldið í hendi (óendanlegur massi).
 * Ýtir þeim í sundur og skiptir á hraða eftir árekstrarstefnu. Skilar true ef þær snertust.
 */
export function aresktur(a, b, endurkast = 0.6) {
  if (a.kyrr && b.kyrr) return false;
  const dx = b.p.x - a.p.x, dy = b.p.y - a.p.y, dz = b.p.z - a.p.z;
  const d = Math.hypot(dx, dy, dz), min = a.r + b.r;
  if (d >= min) return false;
  const [nx, ny, nz] = d > 1e-6 ? [dx / d, dy / d, dz / d] : [1, 0, 0];
  const wa = a.kyrr ? 0 : b.kyrr ? 1 : 0.5, wb = 1 - wa;
  const yfir = min - d;
  a.p.x -= nx * yfir * wa; a.p.y -= ny * yfir * wa; a.p.z -= nz * yfir * wa;
  b.p.x += nx * yfir * wb; b.p.y += ny * yfir * wb; b.p.z += nz * yfir * wb;

  const vr = (b.v.x - a.v.x) * nx + (b.v.y - a.v.y) * ny + (b.v.z - a.v.z) * nz;
  if (vr >= 0) return true; // eru þegar að fjarlægjast
  const j = -(1 + endurkast) * vr;
  const ja = a.kyrr ? 0 : b.kyrr ? j : j / 2, jb = b.kyrr ? 0 : a.kyrr ? j : j / 2;
  a.v.x -= nx * ja; a.v.y -= ny * ja; a.v.z -= nz * ja;
  b.v.x += nx * jb; b.v.y += ny * jb; b.v.z += nz * jb;
  return true;
}
