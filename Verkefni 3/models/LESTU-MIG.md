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
| `skip.glb` | X-wing sem skip Anakins í flugskýlinu og geimnum. Módelið var einfaldað, áferðir minnkaðar og skrár pakkaðar í GLB. | charles.woods, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), [High Poly X-Wing Fighter](https://sketchfab.com/3d-models/high-poly-x-wing-fighter-f2170d4a3ee04e8588c0ad29d4f91767), [niðurhal og höfundartilvísun](https://github.com/Compote0/StarWarsScene-Three.JS/tree/0f797ff4b82efa0eaab3c28696a6f70ab7eb4678/models) |
| `tie.glb` | TIE orrustuflaugarnar í geimnum. Samhæfir möskvar sameinaðir og skrár pakkaðar í GLB. | Ilyas.King, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), [TIE-fighter from STAR WARS](https://sketchfab.com/3d-models/tie-fighter-from-star-wars-ff8f1efcfa2241eda50e4703d9fab990), [niðurhal og höfundartilvísun](https://github.com/liamxaro/StarWarsInSpace/tree/37f6a0ae219971b1ddd4d1bd0763b2a6b7fdb2a2/static/models) |
| `minn-hlutur.glb` | **vantar:** hluturinn sem þú ljósmyndar og breytir í 3D | þú |

Nokkur Sketchfab-módel voru aðlöguð til að leikurinn hlæðist hraðar:

- Áferðir Anakins, B1 og R2-D2 minnkaðar í 1024 px (B1 var 4096 px, ein myndin var 17 MB).
- `anakin_lightsaber.glb`: þríhyrningum fækkað í ~10% með gltf-transform (10,7 MB → 1,2 MB).
- `millennium_falcon.glb`: áferðir, normals og UV teknar burt og þríhyrningum fækkað (25 MB → 0,35 MB). Heilmyndin notar hvort eð er bara eitt gegnsætt blátt efni.

## skip.glb og tie.glb

Ef þessar skrár eru ekki til eru skipið og TIE flaugarnar einföld líkön úr grunnformum (`buaTilSkipslikan()` og `buaTilTieLikan()` í `js/geimur.js`).

- Nöfnin verða að vera nákvæmlega `skip.glb` og `tie.glb`. Ef módelið er `.gltf` mappa (eins og Sketchfab gefur), breyttu `SKIP_SLOD` / `TIE_SLOD` efst í `js/geimur.js` í t.d. `'models/x_wing/scene.gltf'`.
- Kóðinn skalar þau sjálfur (skipið 8 m, TIE 6 m) og setur miðjuna í 0,0,0.
- Ef skipið flýgur afturábak eða á hlið, breyttu `SKIP_SNUNINGUR` (t.d. `Math.PI` eða `Math.PI / 2`).
- Reyndu að finna módel undir ~10 MB, annars verður hleðslan hæg.

## Módel fyrir flugskýlið og geiminn

| Skrá | Módel | Höfundur og leyfi |
| --- | --- | --- |
| `smithmaps/prop_coffin_crate.gltf` | Sci-fi geymslukassi | SmithMaps (scampbe3), [CC0 1.0](https://github.com/scampbe3/My_GLTFs/blob/7c3bb928d2d2efe739cccc586b989c090b2ce0bd/LICENSE), [frumskrá](https://github.com/scampbe3/My_GLTFs/blob/7c3bb928d2d2efe739cccc586b989c090b2ce0bd/vjun/prop_coffin_crate.gltf) |
| `smithmaps/prop_comp.gltf` | Tölva fyrir stjórnborð | SmithMaps (scampbe3), [CC0 1.0](https://github.com/scampbe3/My_GLTFs/blob/7c3bb928d2d2efe739cccc586b989c090b2ce0bd/LICENSE), [frumskrá](https://github.com/scampbe3/My_GLTFs/blob/7c3bb928d2d2efe739cccc586b989c090b2ce0bd/vjun/prop_comp.gltf) |
| `smithmaps/prop_green_tubes.gltf` | Vél með grænum rörum | SmithMaps (scampbe3), [CC0 1.0](https://github.com/scampbe3/My_GLTFs/blob/7c3bb928d2d2efe739cccc586b989c090b2ce0bd/LICENSE), [frumskrá](https://github.com/scampbe3/My_GLTFs/blob/7c3bb928d2d2efe739cccc586b989c090b2ce0bd/vjun/prop_green_tubes.gltf) |
| `smithmaps/prop_gas_can.gltf` | Eldsneytisbrúsi | SmithMaps (scampbe3), [CC0 1.0](https://github.com/scampbe3/My_GLTFs/blob/7c3bb928d2d2efe739cccc586b989c090b2ce0bd/LICENSE), [frumskrá](https://github.com/scampbe3/My_GLTFs/blob/7c3bb928d2d2efe739cccc586b989c090b2ce0bd/czerka/prop_gas_can.gltf) |
| `loftsteinar/bennu.glb` | Loftsteinninn Bennu (1999 RQ36) | NASA 3D Resources, [frumskrá](https://github.com/nasa/NASA-3D-Resources/tree/11ebb4ee043715aefbba6aeec8a61746fad67fa7/3D%20Models/1999%20RQ36%20asteroid) |
| `loftsteinar/eros.glb` | Loftsteinninn 433 Eros | NASA 3D Resources, [frumskrá](https://github.com/nasa/NASA-3D-Resources/tree/11ebb4ee043715aefbba6aeec8a61746fad67fa7/3D%20Printing/Asteroid%20433%20Eros) |
| `loftsteinar/itokawa.glb` | Loftsteinninn 25143 Itokawa | NASA 3D Resources, [frumskrá](https://github.com/nasa/NASA-3D-Resources/tree/11ebb4ee043715aefbba6aeec8a61746fad67fa7/3D%20Printing/Asteroid%2025143%20Itokawa) |

NASA birtir loftsteinamódelin til frjálsrar notkunar samkvæmt [skilmálum NASA 3D Resources](https://github.com/nasa/NASA-3D-Resources/blob/11ebb4ee043715aefbba6aeec8a61746fad67fa7/README.md). Eros og Itokawa voru flutt úr STL í GLB og einfölduð í 12.000 þríhyrninga hvort.

## Skrár úr heildarleitinni

X-wing og TIE Fighter hlaðast sjálfkrafa samkvæmt skránöfnunum hér að ofan. Módelin í töflunni hér fyrir neðan eru tilbúin til innsetningar í senurnar. Sjá [niðurstöður fyrir alla 31 liðina](LEITARNIDURSTODUR.md).

| Skrá | Notkun | Höfundur, leyfi og uppruni |
| --- | --- | --- |
| `geimur/death-star.glb` | Dauðastjarna. Rúmfræði og yfirborð aðlöguð úr shader-dæmi. | Erik Nordeus, [MIT](geimur/death-star-MIT.txt), [frumheimild](https://github.com/Habrador/Unity-Advanced-Shaders-Tutorial/tree/dffb55485ad23bcfe081dd5d69e309b2b19bc8c8/Assets/Shaders/Death%20star) |
| `geimur/star-destroyer.glb` | Star Destroyer, pakkaður úr glTF í GLB. | rubaun, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), [Star Destroyer](https://sketchfab.com/3d-models/star-destroyer-aaa18e14129a461c839877389bd28504), [niðurhal og höfundartilvísun](https://github.com/liamxaro/StarWarsInSpace/tree/37f6a0ae219971b1ddd4d1bd0763b2a6b7fdb2a2/static/models) |
| `geimur/tie-interceptor.glb` | Ein TIE Interceptor-flaug tekin úr flugsveit. Samhæfir möskvar sameinaðir og skrár pakkaðar í GLB. | Pixel, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), [Star Wars TIE Interceptor](https://sketchfab.com/3d-models/star-wars-tie-interceptor-bf5f2c21f40544dd88b75c156e62c9e1), [niðurhal og höfundartilvísun](https://github.com/Compote0/StarWarsScene-Three.JS/tree/0f797ff4b82efa0eaab3c28696a6f70ab7eb4678/models) |
| `geimur/tie-bomber.glb` | TIE Bomber, pakkaður úr glTF í GLB. | Daniel (DanielAndersson), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), [Star Wars: TIE/sa Bomber](https://sketchfab.com/3d-models/star-wars-tiesa-bomber-f7047bcf9c464236b315a4daea9d8c31), [niðurhal og höfundartilvísun](https://github.com/yacgauryac/xwing-shooter/tree/73f4b9c64e96ff2504cfdbf3a239f82ec36d469e/assets/models/tie_bomber) |
| `geimur/tycho-star-map.jpg` | Stjörnubakgrunnur, equirectangular, 2880 × 1440. | NASA 3D Resources, [notkunarskilmálar](https://github.com/nasa/NASA-3D-Resources/blob/11ebb4ee043715aefbba6aeec8a61746fad67fa7/README.md), [Tycho Star Map](https://github.com/nasa/NASA-3D-Resources/tree/11ebb4ee043715aefbba6aeec8a61746fad67fa7/Images%20and%20Textures/Tycho%20Star%20Map) |
| `geimur/geimstod.glb` | Sci-fi geimstöð, „3December 2021 Day 7: Space Station“. | Liberi Arcano, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), [frumheimild](https://skfb.ly/orEW9), [niðurhal og höfundartilvísun](https://github.com/nealholt/space-shooter-3d/tree/9c4dab96615f06964b9c94e35c7bb232e87555de/Assets/SpaceStation) |
| `geimur/mars.glb` | Kúla með Mars-áferð NASA. | NASA 3D Resources, [notkunarskilmálar](https://github.com/nasa/NASA-3D-Resources/blob/11ebb4ee043715aefbba6aeec8a61746fad67fa7/README.md), [frumáferð](https://github.com/nasa/NASA-3D-Resources/tree/11ebb4ee043715aefbba6aeec8a61746fad67fa7/Images%20and%20Textures/Mars) |
| `geimur/explosion-particles.png` | Eldur, glampi, neisti og reykur. Átta stakir 256 × 256 reitir í 4 × 2 grind. | Kenney, CC0 1.0, [Particle Pack og leyfi](https://github.com/Calinou/kenney-particle-pack/tree/ab7086639ee73be31abd87feb21bf1402d4e8144) |
| `kenney/barrels_rail.glb` | Tunnur. | Kenney, [CC0 1.0](kenney/License.txt), [Space Kit](https://kenney.nl/assets/space-kit), [niðurhalsspegill](https://www.npmjs.com/package/@anabis/kenney-space-kit-mirror) |
| `kenney/desk_computerCorner.glb` | Stjórnborð. | Kenney, [CC0 1.0](kenney/License.txt), [Space Kit](https://kenney.nl/assets/space-kit) |
| `kenney/machine_generatorLarge.glb` | Rafall fyrir flugskýlið. | Kenney, [CC0 1.0](kenney/License.txt), [Space Kit](https://kenney.nl/assets/space-kit) |
| `quaternius/holobord-grunnur.glb` | Pallur undir heilmynd, „Props_Teleporter_1“. | Quaternius, CC0 1.0, [frumheimild og leyfi](https://github.com/trebeljahr/quaternius-showcase/blob/0128ca510d653bb04d6d1e4885bd8890b5050b4f/LICENSES.md) |
| `quaternius/knight-character.glb` | Beinagrind með 12 hreyfingum, þar á meðal kyrrstöðu með sverði, hlaupi og tveimur sverðshöggum. Hreyfingarnar þarf að færa yfir á Anakin. | Quaternius, CC0 1.0, [Animated Knight Pack og leyfi](https://github.com/trebeljahr/quaternius-showcase/blob/0128ca510d653bb04d6d1e4885bd8890b5050b4f/LICENSES.md) |
| `kaykit/landingpad_large.glb` | Lendingarpallur, pakkaður úr glTF í GLB. | Kay Lousberg, [CC0 1.0](kaykit/License.txt), [Space Base Bits 1.0](https://github.com/KayKit-Game-Assets/KayKit-Space-Base-Bits-1.0/tree/6dfbcac9927d06283752c4defd4882cfe0d29666) |
| `ldraw/dooku-lightsaber.glb` | Rautt geislasverð Dooku í stíl mínífígúru, fært úr LDraw í GLB og skalað. Blaðið er rautt og lýsandi. | Massimo Maso, Tim Gould, Steve Bliss, Alex Taylor, James Jessiman og Donald Sutter, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), [hlutar og höfundar](ldraw/dooku-credits.json), [frumskrá](https://github.com/ldraw-org/official-library/blob/894bbba5e696b1554800d8e45134c57163dba905/ldraw/parts/42114c01.dat) |
