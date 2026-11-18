# Óskalisti: módel til að sækja

Raðað eftir því hversu miklu hvert módel breytir. Byrjaðu efst og farðu eins langt niður og þú nennir.

## Almennt um öll módel

- **Hvar:** [Sketchfab](https://sketchfab.com) með síunni *Downloadable*. Veldu **glTF** eða **GLB** þegar þú sækir.
- **Leyfi:** helst **CC-BY** eða **CC0** (þá má nota þau í verkefni ef höfundur er nefndur). Skrifaðu niður nafn höfundar.
- **Stærð:** helst undir **10–15 MB**. Leitaðu að "low poly" ef módelin eru risastór. Ég get minnkað áferðir og einfaldað módel, en ekki galdrað.
- **Karakterar:** þurfa að vera **rigged** (með beinagrind) og helst í **T-stellingu**. Þá get ég fært mocap hreyfingar yfir á þá eins og á Anakin.
- **Hvernig á að skila:** settu möppuna eða skrána beint í `models/` og pushaðu. Segðu mér hvaða skrá er hvað ef nafnið er ekki augljóst.

---

## Forgangur 1: þetta breytir mestu

| # | Módel | Leitarorð á Sketchfab | Notað í | Athugasemdir |
| --- | --- | --- | --- | --- |
| 1 | **Jedi Interceptor Anakins** (Eta-2 Actis) | `eta-2 actis`, `anakin jedi interceptor`, `jedi starfighter` | skipið þitt (`skip.glb`) | Ef ekkert finnst: Delta-7 Aethersprite, Naboo N-1 eða X-wing |
| 2 | **TIE Fighter** | `tie fighter`, `tie ln` | óvinirnir í geimnum (`tie.glb`) | Mikilvægast á eftir skipinu |
| 3 | **Mixamo hreyfingar** fyrir Anakin | sjá kaflann fyrir neðan | betri ganga, hlaup og alvöru sverðshögg | Þetta lagar hreyfingarnar mest |
| 4 | **Stormtrooper** (rigged) | `stormtrooper rigged`, `stormtrooper t-pose` | verðir í flugskýlinu | Ég set mocap idle á þá |
| 5 | **TIE Advanced x1** (TIE Vaders) | `tie advanced x1`, `vader tie` | lokaóvinur í síðustu bylgjunni | Getur verið „boss“ með meira líf |
| 6 | **Imperial Star Destroyer** | `star destroyer low poly`, `imperial star destroyer` | risastórt skip í bakgrunni geimsins | TIE flaugarnar geta komið út úr því |

### Mixamo hreyfingar (nr. 3)

1. Farðu á [mixamo.com](https://www.mixamo.com) og skráðu þig inn (ókeypis Adobe aðgangur).
2. Veldu karakterinn **Y Bot** (undir *Characters*).
3. Sæktu þessar hreyfingar, eina í einu (*Animations* → leita → *Download*):

| Hreyfing (leitarorð) | Til hvers |
| --- | --- |
| `Standing Idle` eða `Breathing Idle` | Anakin stendur kyrr |
| `Great Sword Idle` | stendur kyrr með sverðið í varnarstöðu |
| `Walking` | ganga |
| `Running` eða `Sword And Shield Run` | hlaup |
| `Great Sword Slash` eða `Sword And Shield Slash` | sverðshögg (2–3 mismunandi ef þú nennir) |
| `Sword And Shield Block` | þegar hann ver sig |
| `Rifle Idle` / `Rifle Aim` | fyrir stormtroopers og droida með byssu |
| `Looking Around` | fyrir verðina í flugskýlinu |

4. Stillingar við niðurhal: **Format: FBX Binary (.fbx)**, **Skin: Without Skin**, **Frames per second: 30**, og hakaðu í **In Place** þar sem það býðst (annars gengur hann af stað og hoppar til baka).
5. Settu allar .fbx skrárnar í `models/mixamo/`.

---

## Forgangur 2: flottari geimur

| # | Módel | Leitarorð | Notað í |
| --- | --- | --- | --- |
| 7 | **TIE Interceptor** | `tie interceptor` | hraðari óvinur í seinni bylgjum |
| 8 | **TIE Bomber** | `tie bomber` | hægur óvinur með meira líf |
| 9 | **X-wing** eða **ARC-170** | `x-wing`, `arc-170` | félagar sem fljúga með þér (wingmen) |
| 10 | **Dauðastjarnan** (Death Star) | `death star` | í bakgrunni í stað plánetunnar, eða sem lokamark |
| 11 | **Loftsteinar** (pakki) | `asteroid pack`, `asteroids low poly` | í stað loftsteinanna úr grunnformum |
| 12 | **Geim-skybox / HDRI** | `space skybox`, `nebula skybox` (líka á [Poly Haven](https://polyhaven.com) eða itch.io) | bakgrunnur geimsins. Mynd í *equirectangular* formi (.jpg/.hdr) eða 6 myndir |
| 13 | **Geimstöð** eða **Venator** | `venator star destroyer`, `space station sci-fi` | skipið sem flugskýlið er í, sést þegar þú flýgur út |
| 14 | **Pláneta** (t.d. Tatooine, Coruscant, Mustafar) | `tatooine planet`, `planet` | í stað plánetunnar sem er teiknuð í kóða |

---

## Forgangur 3: flottara flugskýli

| # | Módel | Leitarorð | Notað í |
| --- | --- | --- | --- |
| 15 | **Mouse droid** (MSE-6) | `mouse droid`, `mse-6` | lítill droid sem þýtur um gólfið |
| 16 | **Gonk droid** (GNK) | `gonk droid` | rólegur droid sem gengur fram og til baka |
| 17 | **Probe droid** (Viper) | `probe droid`, `viper probe droid` | í stað veranna í horninu sem ég bjó til úr kúlum |
| 18 | **Droideka** | `droideka` | rúllar inn og opnast, töff idle |
| 19 | **Super Battle Droid** | `super battle droid` | verðir |
| 20 | **Clone Trooper** (rigged) | `clone trooper rigged` | í stað eða ásamt stormtroopers |
| 21 | **Sci-fi kassar og tunnur** | `sci-fi crate`, `star wars crate`, `sci-fi barrel` | í stað kassanna úr grunnformum |
| 22 | **Stjórnborð / tölvur** | `sci-fi console`, `star wars terminal` | við veggina |
| 23 | **Eldsneytisdæla / vél** | `sci-fi fuel`, `hangar equipment` | við skipið |
| 24 | **Heilmyndarborð** | `holotable`, `hologram table` | í stað borðsins úr sívalningum |
| 25 | **Lendingarpallur** | `landing pad sci-fi` | undir skipinu |

---

## Forgangur 4: ef þú vilt fara alla leið

| # | Módel | Leitarorð | Notað í |
| --- | --- | --- | --- |
| 26 | **Stjórnklefi** (cockpit interior) | `starfighter cockpit`, `x-wing cockpit` | fyrstu persónu sýn í geimnum (takki til að skipta) |
| 27 | **Darth Vader** (rigged) | `darth vader rigged` | Anakin breytist í Vader í lokin, eða lokabardagi |
| 28 | **Obi-Wan Kenobi** (rigged) | `obi-wan rigged` | félagi eða andstæðingur í sverðabardaga |
| 29 | **Count Dooku** eða **General Grievous** | `dooku rigged`, `grievous rigged` | sverðabardagi í flugskýlinu |
| 30 | **Önnur geislasverð** (blátt Obi-Wan, rautt Vader/Dooku) | `obi-wan lightsaber`, `vader lightsaber` | fyrir andstæðinga |
| 31 | **Sprengingar / reykur** (sprite sheet) | `explosion sprite sheet` (itch.io, OpenGameArt) | flottari sprengingar |

Ef þú finnur eitthvað annað sem þér finnst töff, sæktu það líka.
