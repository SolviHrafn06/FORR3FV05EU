"""
Býr til öll hljóð (hljod/*.mp3) og áferðir (aferdir/*.png) fyrir Verkefni 3.

Ekkert er sótt af netinu: hljóðin eru reiknuð með sínusbylgjum og suði (numpy)
og áferðirnar eru teiknaðar pixel fyrir pixel. Þarf python3, numpy, Pillow og ffmpeg.

Keyrsla (úr möppunni "Verkefni 3"):
    python3 verkfaeri/bua_til_hljod_og_aferdir.py
"""

import subprocess
import wave
from pathlib import Path

import numpy as np
from PIL import Image

RATE = 44100
ROT = Path(__file__).resolve().parent.parent
rng = np.random.default_rng(7)


# ---------- hjálparföll fyrir hljóð ----------

def timi(sek):
    return np.arange(int(RATE * sek)) / RATE


def laagpass(x, styrkur):
    """Einföld lágtíðnisía (one-pole). styrkur nær 1 = dýpra hljóð."""
    y = np.zeros_like(x)
    for i in range(1, len(x)):
        y[i] = styrkur * y[i - 1] + (1 - styrkur) * x[i]
    return y


def hum(t, grunntidni):
    """Suð geislasverðs: grunntónn + yfirtónar, eins og sagtannarbylgja."""
    fasi = 2 * np.pi * np.cumsum(np.broadcast_to(grunntidni, t.shape)) / RATE
    s = np.zeros_like(t)
    for n in range(1, 9):
        s += np.sin(n * fasi) / n ** 1.3
    return s


def lykkja(x, sek=0.25):
    """Blandar endann inn í byrjunina svo hljóðið hljómi samfellt í lykkju."""
    n = int(RATE * sek)
    fade = np.linspace(0, 1, n)
    x = x.copy()
    x[:n] = x[:n] * fade + x[-n:] * (1 - fade)
    return x[:-n]


def vista(nafn, x, styrkur=0.8):
    x = x / (np.max(np.abs(x)) + 1e-9) * styrkur
    wav = ROT / 'hljod' / (nafn + '.wav')
    mp3 = ROT / 'hljod' / (nafn + '.mp3')
    wav.parent.mkdir(exist_ok=True)
    with wave.open(str(wav), 'wb') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(RATE)
        f.writeframes((x * 32767).astype(np.int16).tobytes())
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav),
                    '-codec:a', 'libmp3lame', '-b:a', '96k', str(mp3)], check=True)
    wav.unlink()
    print('bjó til', mp3.relative_to(ROT))


# ---------- hljóðin ----------

def umhverfi():
    """Djúpt drunur í geimstöð, 20 sek lykkja."""
    t = timi(20.25)
    drunur = (np.sin(2 * np.pi * 41.2 * t) * (0.6 + 0.4 * np.sin(2 * np.pi * t / 10))
              + 0.6 * np.sin(2 * np.pi * 55 * t)
              + 0.3 * np.sin(2 * np.pi * 82.4 * t) * (0.5 + 0.5 * np.sin(2 * np.pi * t / 5)))
    vindur = laagpass(rng.normal(0, 1, len(t)), 0.995) * 12
    vindur *= 0.6 + 0.4 * np.sin(2 * np.pi * t / 6.75)
    vista('umhverfi', lykkja(drunur + vindur), 0.7)


def sverd():
    """Suð geislasverðsins, 4 sek lykkja. Tveir tónar sem slá saman."""
    t = timi(4.25)
    s = hum(t, 90) + 0.7 * hum(t, 91.5)
    s += laagpass(rng.normal(0, 1, len(t)), 0.9) * 0.6
    vista('sverd', lykkja(s), 0.8)


def kveikja():
    """Hvæs þegar sverðið kviknar: tónn sem fellur hratt niður í suðið."""
    t = timi(1.0)
    tidni = 90 + 500 * np.exp(-t * 7)
    s = hum(t, tidni) * np.minimum(1, t * 40)
    hvaes = rng.normal(0, 1, len(t)) * np.exp(-t * 9) * 1.5
    s = (s + hvaes) * np.minimum(1, (1 - t) * 6)
    vista('kveikja', s, 0.9)


def sveifla():
    """Sverðinu sveiflað: suðið hækkar og lækkar (doppler)."""
    t = timi(0.55)
    bogi = np.sin(np.pi * t / t[-1])
    s = hum(t, 90 * (1 + 0.7 * bogi)) * bogi ** 1.5
    s += laagpass(rng.normal(0, 1, len(t)), 0.7) * bogi ** 2 * 1.2
    vista('sveifla', s, 0.9)


def droid():
    """Lágt rafmagnssuð og píp frá könnunar-droidnum, 6 sek lykkja."""
    t = timi(6.25)
    s = 0.25 * np.sin(2 * np.pi * 120 * t) + 0.12 * np.sin(2 * np.pi * 240 * t)
    for byrjun, tidni in [(0.4, 1800), (0.55, 2300), (2.1, 1400), (3.6, 2100), (3.72, 2600), (3.84, 1700)]:
        b = timi(0.09)
        pip = np.sin(2 * np.pi * (tidni + 4000 * b) * b) * np.sin(np.pi * b / b[-1])
        i = int(byrjun * RATE)
        s[i:i + len(pip)] += 0.5 * pip
    vista('droid', lykkja(s), 0.7)


def hurd():
    """Loftþrýstihvæs þegar hurðin opnast + dynkur í lokin."""
    t = timi(1.3)
    hvaes = laagpass(rng.normal(0, 1, len(t)), 0.5) * np.minimum(1, t * 20) * np.exp(-t * 2.5)
    dynkur = np.sin(2 * np.pi * 55 * t) * np.exp(-np.maximum(0, t - 0.9) * 12) * (t > 0.9)
    vista('hurd', hvaes + 1.5 * dynkur, 0.85)


def blaster():
    """Leysiskot frá battle droid: hár tónn sem fellur hratt."""
    t = timi(0.3)
    tidni = 300 + 1700 * np.exp(-t * 14)
    fasi = 2 * np.pi * np.cumsum(tidni) / RATE
    s = np.sign(np.sin(fasi)) * 0.5 + np.sin(fasi)   # hálf ferhyrningsbylgja
    vista('blaster', s * np.exp(-t * 9), 0.7)


def endurkast():
    """Sverðið slær skotið til baka: málmhljómur + suð."""
    t = timi(0.5)
    hljomur = sum(np.sin(2 * np.pi * f * t) for f in (1250, 1870, 2630)) * np.exp(-t * 10)
    s = hljomur + hum(t, 140) * np.exp(-t * 8) * 1.5 + rng.normal(0, 1, len(t)) * np.exp(-t * 40)
    vista('endurkast', s, 0.85)


def sprenging():
    """Droid brotnar: dynkur og brak."""
    t = timi(0.9)
    dynkur = laagpass(rng.normal(0, 1, len(t)), 0.97) * 25 * np.exp(-t * 5)
    brak = rng.normal(0, 1, len(t)) * (rng.random(len(t)) < 0.02) * np.exp(-t * 4) * 3
    vista('sprenging', dynkur + brak + np.sin(2 * np.pi * 50 * t) * np.exp(-t * 7), 0.9)


def r2():
    """R2-D2 píp: nokkur stutt flaut sem renna upp og niður með titringi."""
    r = np.random.default_rng(42)   # sér slembigjafi svo hin hljóðin breytist ekki
    hlutar = []
    for _ in range(7):
        lengd = r.uniform(0.06, 0.18)
        t = timi(lengd)
        byrjun, endir = r.uniform(900, 3200, 2)
        tidni = byrjun + (endir - byrjun) * (t / lengd) ** r.uniform(0.5, 2)
        tidni *= 1 + 0.04 * np.sin(2 * np.pi * r.uniform(20, 45) * t)   # titringur
        fasi = 2 * np.pi * np.cumsum(tidni) / RATE
        hlutar.append(np.sin(fasi) * np.sin(np.pi * t / lengd) ** 0.5)
        hlutar.append(np.zeros(int(RATE * r.uniform(0.0, 0.05))))
    vista('r2', np.concatenate(hlutar), 0.7)


def geimhljod():
    """Hljóð fyrir geimhlutann: hreyfill (lykkja), geislabyssa skipsins og öskur TIE flauganna."""
    r = np.random.default_rng(99)

    t = timi(4.25)
    hreyfill = laagpass(r.normal(0, 1, len(t)), 0.985) * 10
    hreyfill += 0.5 * np.sin(2 * np.pi * 60 * t) + 0.25 * np.sin(2 * np.pi * 120.5 * t)
    hreyfill *= 0.85 + 0.15 * np.sin(2 * np.pi * t / 2.125)
    vista('hreyfill', lykkja(hreyfill), 0.7)

    t = timi(0.25)
    tidni = 180 + 900 * np.exp(-t * 22)
    fasi = 2 * np.pi * np.cumsum(tidni) / RATE
    vista('geislabyssa', (np.sin(fasi) + 0.4 * np.sign(np.sin(fasi * 0.5))) * np.exp(-t * 12), 0.75)

    # TIE öskur: hátt, rámt hljóð sem rennur niður (dopplerhrif þegar flaugin þýtur hjá)
    t = timi(1.4)
    tidni = 900 - 450 * (t / t[-1]) ** 1.5
    fasi = 2 * np.pi * np.cumsum(tidni) / RATE
    oskur = np.sin(fasi) + 0.6 * np.sin(1.5 * fasi + 2 * np.sin(fasi * 0.07))
    oskur += laagpass(r.normal(0, 1, len(t)), 0.3) * 1.2
    vista('tie', oskur * np.abs(np.sin(np.pi * t / t[-1])) ** 0.7, 0.75)


# ---------- áferðir ----------

def vista_mynd(nafn, gildi, litur):
    """gildi er 0..1 grámynd, litur er (r, g, b) sem hún er lituð með."""
    rgb = np.clip(gildi[..., None] * np.array(litur)[None, None, :], 0, 255).astype(np.uint8)
    slod = ROT / 'aferdir' / (nafn + '.png')
    slod.parent.mkdir(exist_ok=True)
    Image.fromarray(rgb).save(slod, optimize=True)
    print('bjó til', slod.relative_to(ROT))


def golf():
    """Dökkar málmplötur, 2x2 plötur á hverri mynd (myndin endurtekur sig)."""
    n = 512
    y, x = np.mgrid[0:n, 0:n]
    g = 0.55 + rng.normal(0, 0.035, (n, n))
    g += np.sin(x / 3.0 + rng.normal(0, 0.3, (n, n))) * 0.015  # burstaðar rákir
    # hver plata aðeins mismunandi á litinn
    for py in range(2):
        for px in range(2):
            g[py * 256:(py + 1) * 256, px * 256:(px + 1) * 256] *= rng.uniform(0.9, 1.08)
    # raufar á milli plata
    rauf = (x % 256 < 4) | (y % 256 < 4)
    g[rauf] = 0.12
    # skrúfur í hornunum
    for cy in (18, 238):
        for cx in (18, 238):
            for oy in (0, 256):
                for ox in (0, 256):
                    d = np.hypot(x - (cx + ox), y - (cy + oy))
                    g[d < 5] = 0.85
                    g[(d >= 5) & (d < 7)] = 0.25
    # rist í miðri hverri plötu
    rist = ((x % 256 > 96) & (x % 256 < 160) & (y % 256 > 96) & (y % 256 < 160)) & (x % 8 < 3)
    g[rist] = 0.2
    vista_mynd('golf', g, (120, 125, 135))


def veggur():
    """Veggplötur: lóðréttar plötur með láréttum raufum og innfelldum ferningum."""
    n = 512
    y, x = np.mgrid[0:n, 0:n]
    g = 0.5 + rng.normal(0, 0.03, (n, n))
    g[(x % 128 < 3)] = 0.15
    g[(y % 256 < 3)] = 0.15
    innfellt = ((x % 128 > 20) & (x % 128 < 108) & (y % 256 > 40) & (y % 256 < 120))
    g[innfellt] *= 0.7
    kantur = innfellt & ~((x % 128 > 23) & (x % 128 < 105) & (y % 256 > 43) & (y % 256 < 117))
    g[kantur] = 0.8
    rimlar = (y % 256 > 160) & (y % 256 < 230) & (x % 128 > 30) & (x % 128 < 98) & (y % 10 < 4)
    g[rimlar] = 0.18
    vista_mynd('veggur', g, (105, 110, 125))


if __name__ == '__main__':
    umhverfi()
    sverd()
    kveikja()
    sveifla()
    droid()
    hurd()
    blaster()
    endurkast()
    sprenging()
    r2()
    geimhljod()
    golf()
    veggur()
