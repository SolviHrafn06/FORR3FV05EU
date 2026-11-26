import * as THREE from 'three';

// Agnakerfi með föstum fjölda agna (engin ný minnisúthlutun á hverjum ramma).
// Additive litir sem dofna í svart = agnir hverfa; HDR-litir (>1) fá bloom-glóa.

function hringTextura() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, '#fff');
  grad.addColorStop(0.35, 'rgba(255,255,255,.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export class Agnir {
  constructor(scene, fjoldi = 3000) {
    this.n = fjoldi;
    this.pos = new Float32Array(fjoldi * 3);
    this.lit = new Float32Array(fjoldi * 3);
    this.grunn = new Float32Array(fjoldi * 3);
    this.v = new Float32Array(fjoldi * 3);
    this.lif = new Float32Array(fjoldi);
    this.lifMax = new Float32Array(fjoldi).fill(1);
    this.vidnam = new Float32Array(fjoldi);
    this.naest = 0;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.lit, 3).setUsage(THREE.DynamicDrawUsage));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.045, map: hringTextura(), vertexColors: true, transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    this.points.frustumCulled = false;
    this.points.visible = false;
    scene.add(this.points);
  }

  /**
   * inn=true: agnir byrja á kúluskel og sogast inn að miðju (birting).
   * inn=false: springa út frá miðju (sprenging, neistar).
   */
  spraut(midja, fjoldi, { hradi = 1.5, litur = 0x5fe0ff, styrkur = 3, lif = 0.8, radius = 0, inn = false } = {}) {
    const c = new THREE.Color(litur);
    for (let k = 0; k < fjoldi; k++) {
      const i = this.naest++ % this.n, i3 = i * 3;
      // jafndreifð stefna á kúlu
      const u = Math.random() * 2 - 1, f = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      const dx = s * Math.cos(f), dy = u, dz = s * Math.sin(f);
      const l = lif * (0.7 + Math.random() * 0.6);
      if (inn) {
        const r = radius * (0.8 + Math.random() * 0.4);
        this.pos[i3] = midja.x + dx * r; this.pos[i3 + 1] = midja.y + dy * r; this.pos[i3 + 2] = midja.z + dz * r;
        this.v[i3] = -dx * r / l; this.v[i3 + 1] = -dy * r / l; this.v[i3 + 2] = -dz * r / l;
        this.vidnam[i] = 0;
      } else {
        const r = radius * Math.random(), h = hradi * (0.3 + Math.random() * 0.7);
        this.pos[i3] = midja.x + dx * r; this.pos[i3 + 1] = midja.y + dy * r; this.pos[i3 + 2] = midja.z + dz * r;
        this.v[i3] = dx * h; this.v[i3 + 1] = dy * h; this.v[i3 + 2] = dz * h;
        this.vidnam[i] = 2.2;
      }
      const b = styrkur * (0.6 + Math.random() * 0.4);
      this.grunn[i3] = c.r * b; this.grunn[i3 + 1] = c.g * b; this.grunn[i3 + 2] = c.b * b;
      this.lif[i] = this.lifMax[i] = l;
    }
  }

  uppfaera(dt) {
    let lifandi = false;
    for (let i = 0; i < this.n; i++) {
      const i3 = i * 3;
      if (this.lif[i] <= 0) continue;
      lifandi = true;
      this.lif[i] -= dt;
      if (this.lif[i] <= 0) { this.lit[i3] = this.lit[i3 + 1] = this.lit[i3 + 2] = 0; continue; }
      const d = Math.exp(-this.vidnam[i] * dt);
      this.v[i3] *= d; this.v[i3 + 1] *= d; this.v[i3 + 2] *= d;
      this.pos[i3] += this.v[i3] * dt; this.pos[i3 + 1] += this.v[i3 + 1] * dt; this.pos[i3 + 2] += this.v[i3 + 2] * dt;
      const k = this.lif[i] / this.lifMax[i];
      this.lit[i3] = this.grunn[i3] * k; this.lit[i3 + 1] = this.grunn[i3 + 1] * k; this.lit[i3 + 2] = this.grunn[i3 + 2] * k;
    }
    if (lifandi || this.vorLifandi) {
      this.points.geometry.attributes.position.needsUpdate = true;
      this.points.geometry.attributes.color.needsUpdate = true;
    }
    this.vorLifandi = lifandi;
    this.points.visible = lifandi;
  }
}
