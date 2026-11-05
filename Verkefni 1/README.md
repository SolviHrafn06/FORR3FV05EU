# Verkefni 1 — einföld útgáfa

Opnaðu index.html í Edge. HTML, CSS og SVG eru öll í þessari einu skrá. Engin JavaScript og ekkert sem þarf að setja upp.

## Hvað er SVG?

SVG er teikning skrifuð með tögum, svipað og HTML. Innan svg eru hringir og línur í stað málsgreina og tengla.

`viewBox="0 0 600 400"` er eins og blað sem er 600 einingar á breidd og 400 á hæð. (0,0) er efst til vinstri. x vex til hægri og y vex niður. CSS `width: 100%` minnkar allt blaðið á síma án þess að breyta hnitunum.

| Tag | Hvað það gerir |
| --- | --- |
| rect | Bakgrunnurinn. rx rúnnar hornin. |
| text | 404 og textinn á merkinu. |
| circle | Hringir. cx og cy eru miðjan, r er radíusinn. |
| path | Sveigða línan og N-ið. |
| g | Hópar saman formum svo þau hreyfist saman. |

`fill` er innri litur. `stroke` er útlínulitur og `stroke-width` er þykkt útlínunnar. `fill="none"` sleppir innri litnum.

## Hvernig les ég path?

Byrjaðu á stuttu línunni:

```html
<path d="M 70 300 Q 300 210 530 300" />
```

- M 70 300: settu pennann í punktinn x=70, y=300.
- Q 300 210 530 300: teiknaðu sveigju að (530,300). Punkturinn (300,210) togar sveigjuna upp.
- Í N-inu er líka L: teiknaðu beina línu að næsta punkti.
- Nýtt M byrjar nýjan hluta án þess að tengja hann við fyrri línu.

Merkið er einfölduð handteiknuð túlkun á NST-merkinu, ekki nákvæm vektoreftirmynd. Upprunalega merkið hefur flóknara letur og skraut. Ef kennari krefst nákvæmrar eftirmyndar þarf að útfæra merkið nánar.

## Tvær kvikanir í röð

**Fyrst teiknast línan, í 2 sekúndur.** Hún hefur pathLength="100", þannig að við getum hugsað um lengdina sem 100. `stroke-dasharray: 100` býr til langan strikahluta og bil. `stroke-dashoffset` færist úr 100 í 0 og afhjúpar línuna. Þetta er dýpkunarhlutinn í verkefninu.

**Síðan svífur merkið, í 3 sekúndur.** `translateY` færir það upp og niður. Við 50% er það 18 einingum ofar og við 100% er það aftur á upphafsstað.

```css
.svif { animation: svifa 3s ease-in-out 2s; }
```

Lestu þetta svona: Notaðu kvikunina svifa; hún tekur 3 sekúndur; ease-in-out mýkir byrjun og endi; bíddu í 2 sekúndur áður en hún byrjar. Þannig lýkur línuteikningunni áður en svifið byrjar.

`@keyframes` lýsir breytingunni frá upphafi til enda. Prósenturnar eru staðir í tíma kvikunarinnar. Hún keyrir einu sinni því ekkert infinite er tilgreint. Endurhladdu síðuna til að sjá kvikunina aftur.

## Músaráhrif

`svg:hover .merki` velur merkið þegar músin er yfir myndinni. `rotate(10deg)` hallar því um 10 gráður. `transition` gerir breytinguna mjúka. Ytri g-hópurinn sér um svif og sá innri um snúning svo þau trufli ekki hvort annað.

Forsíðuhnappurinn notar líka venjulegt CSS hover. `prefers-reduced-motion` slekkur á hreyfingum þegar notandi hefur valið minni hreyfingu í tækinu sínu.

## Prófaðu sjálf/ur

1. Breyttu litnum í .tolur.
2. Breyttu -18px í -30px. Merkið fer hærra.
3. Breyttu síðasta 2s í .svif í 4s. Merkið bíður lengur.
4. Breyttu 10deg í -10deg. Merkið hallar í hina áttina.

## Námsmatsatriði

- Skalanleg mynd: viewBox og width: 100%.
- Path-teikning: einfaldaða N-ið í merkinu.
- SVG-texti: 404 með fill og stroke.
- Grunnform og hópar: rect, circle, path og g.
- Keyframes, transform og mjúk tímasetning.
- Tvær kvikanir í röð með 2 sekúndna bið.
- Músaráhrif með hover og transition.
- Dýpkun: línuteikning með stroke-dasharray og stroke-dashoffset.

Verkefnalýsing: https://github.com/GunnarThorunnarson/FORR3FV05EU/blob/master/Verkefni/V1.md

Fyrirmynd merkis: Myndir/logo/nemendafélag logo.webp í sama geymslusafni.
