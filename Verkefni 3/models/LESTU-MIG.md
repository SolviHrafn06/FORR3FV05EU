# Módelin

| Skrá / mappa | Notað sem | Höfundur og leyfi |
| --- | --- | --- |
| `anakin_skywalker__battlefront_ii/` | Anakin, karakterinn sem þú stýrir | rendysix, CC-BY-4.0 |
| `anakin_lightsaber.glb` | skaftið á geislasverðinu | Khafesys, CC-BY-4.0 |
| `b1_battle_droid_star_wars/` | óvinirnir (battle droidar) | leoxx300, CC-BY-4.0 |
| `millennium_falcon.glb` | heilmyndin á borðinu | fredbear1211, CC-BY-4.0 |
| `star_wars_-_logo/` | merkið í byrjun | David Tena C., CC-BY-4.0 |
| `star_wars_r2-d2/` | R2-D2 sem eltir Anakin | tegnemaskin, CC-BY-4.0 |
| `anakin_skywalker_lightsaber/` | ekki notað (má eyða) | Martin Rabanal 3D, Sketchfab Standard |
| `skip.glb` | **má bæta við:** skip Anakins í flugskýlinu og geimnum (t.d. Jedi interceptor, Delta-7 eða X-wing) | |
| `tie.glb` | **má bæta við:** TIE orrustuflaugarnar í geimnum | |
| `minn-hlutur.glb` | **vantar:** hluturinn sem þú ljósmyndar og breytir í 3D | þú |

Öll módelin eru af Sketchfab. Til að leikurinn hlaðist hraðar var þeim breytt svona:

- Áferðir Anakins, B1 og R2-D2 minnkaðar í 1024 px (B1 var 4096 px, ein myndin var 17 MB).
- `anakin_lightsaber.glb`: þríhyrningum fækkað í ~10% með gltf-transform (10,7 MB → 1,2 MB).
- `millennium_falcon.glb`: áferðir, normals og UV teknar burt og þríhyrningum fækkað (25 MB → 0,35 MB). Heilmyndin notar hvort eð er bara eitt gegnsætt blátt efni.

## skip.glb og tie.glb

Ef þessar skrár eru ekki til eru skipið og TIE flaugarnar einföld líkön úr grunnformum (`buaTilSkipslikan()` og `buaTilTieLikan()` í `js/geimur.js`).

- Nöfnin verða að vera nákvæmlega `skip.glb` og `tie.glb`. Ef módelið er `.gltf` mappa (eins og Sketchfab gefur), breyttu `SKIP_SLOD` / `TIE_SLOD` efst í `js/geimur.js` í t.d. `'models/x_wing/scene.gltf'`.
- Kóðinn skalar þau sjálfur (skipið 8 m, TIE 6 m) og setur miðjuna í 0,0,0.
- Ef skipið flýgur afturábak eða á hlið, breyttu `SKIP_SNUNINGUR` (t.d. `Math.PI` eða `Math.PI / 2`).
- Reyndu að finna módel undir ~10 MB, annars verður hleðslan hæg.
