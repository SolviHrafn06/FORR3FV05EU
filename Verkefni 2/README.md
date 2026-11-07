# Trépúsl

Púsluspil fyrir 2-3 ára börn, gert fyrir spjaldtölvur og síma. Hugmyndin er gamla trépúslið þar sem
form eru sett í rétt göt á viðarborði. Það er enginn texti í leiknum.

Spila: (slóð á GitHub Pages)

## Hvernig leikurinn virkar

Á borðinu eru fjögur mót: hringur, ferningur, þríhyrningur og hjarta. Bitarnir liggja fyrir neðan borðið,
eða við hliðina á því ef skjárinn er á hlið.

- Það þarf að halda fingri á bita í smá stund áður en hann lyftist. Á meðan teiknast hringur í kringum fingurinn.
- Svo er bitinn dreginn að mótinu. Ef hann passar smellur hann ofan í og sólin brosir. Annars fer hann aftur á sinn stað.
- Hjartað og þríhyrningurinn snúa vitlaust í byrjun. Til að snúa þeim er haldið á bitanum og skjárinn snertur
  með öðrum fingri, þá snýst bitinn um 90°.
- Þegar allir bitar eru komnir flýgur býfluga yfir og ör birtist. Þá er strokið til hliðar til að byrja aftur.

## Tækni

Allt er gert í SVG. Hreyfingar eru gerðar með anime.js v4.5 og snertingin með Pointer Events.

anime.js:
- `animate()` fyrir flestar hreyfingar, t.d. þegar bita er lyft, hann vaggar eða smellur í mót.
- `createTimeline()` þegar leikurinn byrjar, þegar allt er komið og þegar byrjað er aftur.
- Line drawing (`svg.createDrawable`): útlínur mótanna teiknast í byrjun og hringurinn utan um fingurinn.
- Morphing (`svg.morphTo`): munnurinn á sólinni breytist og skýið verður að hjarta í lokin.
- Motion path (`svg.createMotionPath`): býflugan.

Pointer Events:
- Long press: `setTimeout` í 400 ms áður en bitinn lyftist.
- Pan: bitinn fylgir fingrinum í `pointermove`.
- Multi-touch: fingurnir eru geymdir eftir `pointerId`. Annar fingur snýr bitanum sem verið er að draga,
  og það er líka hægt að draga tvo bita í einu.
- Swipe: athugað í `pointerup` hvort fingurinn fór langt til hliðar á stuttum tíma.

`touch-action: none` er sett í CSS svo vafrinn skruni ekki eða þysji þegar verið er að draga.

## Keyrsla

Þarf að keyra á vefþjóni út af `import`, t.d. með Live Server í VS Code. Virkar ekki að opna index.html beint.
