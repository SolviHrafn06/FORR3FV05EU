# Dularfulla herbergið – Star Wars

Lítill 3D leikur í Three.js (r187). Anakin Skywalker stendur í dimmu herbergi í geimstöð með geislasverð sem lýsir upp myrkrið.
B1 battle droidar ganga inn um hurðina og skjóta á hann. Anakin slær skotin til baka með sverðinu eða heggur droidana.
R2-D2 rúllar á eftir honum og fylgist með óvinunum. Í horninu svífur könnunar-droid sem snýr sér alltaf að honum, ljósin flökta og Millennium Falcon snýst sem heilmynd á borði.

Þemað er „Dularfulla herbergið“ í Star Wars búningi: næstum tómt herbergi, þrjár súlur, þoka (`FogExp2`), ljósgjafi í hendi karaktersins og furðuleg vera í horninu sem snýr sér að honum með `.lookAt()`.

spila á [github pages](https://solvihrafn06.github.io/FORR3FV05EU/Verkefni%203/)

## Stýring

| Tölva | Sími / spjaldtölva |
| --- | --- |
| **WASD** eða **örvar**: ganga | pikkaðu á gólfið til að ganga þangað |
| **Shift**: hlaupa | **Sveifla** takkinn: höggva |
| **smellur á gólfið**: ganga þangað | **Sverð** takkinn: kveikja / slökkva |
| **Bil**: höggva | |
| **F**: kveikja / slökkva á sverðinu | |

**Leikurinn:** snúðu að droid sem skýtur á meðan sverðið logar, þá slærðu skotið aftur í hann. Ef þú snýrð baki í skotið missirðu líf.
Farðu nálægt droid og ýttu á bil til að höggva hann. Droidunum fjölgar eftir því sem þú sigrar fleiri.

## Áður en þú skilar

1. Ljósmyndaðu hlut, breyttu myndinni í .glb með gervigreindartóli og settu hann í `models/minn-hlutur.glb`.
   Breyttu svo `MINN_HLUTUR_HAED` efst í `js/main.js` í raunverulega hæð hans í metrum.
2. Settu ljósmyndina af hlutnum í Canvas ásamt öllum skránum.

## Skrár

```
Verkefni 3/
  index.html            hleðsluskjár, líf/stig, leikslok, stjórnborð og import map fyrir CDN
  css/style.css
  js/main.js            allur leikurinn
  js/hreyfiklippur.js   hreyfingar sverðshandarinnar, fingra og byssuhanda B1
  hreyfingar/           hreyfingar.json: mocap ganga, hlaup og kyrrstaða, flutt yfir á Anakin og B1
  models/               módelin (sjá models/LESTU-MIG.md)
  aferdir/              golf.png og veggur.png (TextureLoader)
  hljod/                10 hljóð (AudioLoader)
  verkfaeri/            python skrifta (hljóð og áferðir) og flytja-hreyfingar.html (mocap → Anakin/B1)
  UTSKYRINGAR.md        útskýringar á öllum kóðanum
```

Three.js 0.187.0 og Anime.js 4.5.0 (með Three.js adapter) eru sótt af CDN (jsdelivr), engin söfn eru á GitHub.

## Hvaðan kemur efnið

Öll módelin eru af [Sketchfab](https://sketchfab.com) með CC-BY-4.0 leyfi, sem krefst þess að höfundar séu nefndir:

- **Anakin Skywalker (Battlefront II)** eftir rendysix
- **Anakin Lightsaber** eftir Khafesys
- **B1 Battle Droid** eftir leoxx300
- **Millennium Falcon** eftir fredbear1211
- **Star Wars Logo** eftir David Tena C.
- **Star Wars R2-D2** eftir tegnemaskin
- **Hreyfingar (idle, walk, run):** af Xbot módelinu í dæmum [three.js](https://github.com/mrdoob/three.js) (hreyfiföngun frá Mixamo), fluttar yfir á Anakin og B1 með `verkfaeri/flytja-hreyfingar.html`
- **Minn hlutur:** *(hvaða hlut þú ljósmyndaðir og hvaða gervigreindartól breytti myndinni í .glb)*
- **Hljóð og áferðir:** búin til í kóða með `verkfaeri/bua_til_hljod_og_aferdir.py` (sínusbylgjur og suð með numpy), ekkert sótt af netinu.

## AI notkun

Claude (gervigreind) hjálpaði við að setja upp senuna, skrifa kóðann, flytja mocap hreyfingarnar yfir á beinagrindurnar og búa til hljóðin og áferðirnar.
