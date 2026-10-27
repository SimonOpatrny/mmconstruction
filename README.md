# Markstav – návrh nového webu (demo)

Nezávazný návrh kompletně nového webu pro **Marka Mlčocha – Markstav** (stavební práce a rekonstrukce, Hradec Králové).
Čisté HTML5, CSS3 a JavaScript bez frameworků a bez build kroku.

## Struktura

```
markstav-redesign/
├── index.html                    hlavní stránka (všechny sekce)
├── ochrana-osobnich-udaju.html   zásady zpracování osobních údajů (k formuláři)
├── style.css                     veškeré styly
├── script.js                     menu, galerie, lightbox, formulář, animace
├── poptavka.php                  serverové odeslání poptávky e-mailem
└── assets/
    ├── fonts/                    písmo Archivo (self-hosted, licence OFL)
    └── img/                      logo, favicon, ikona pro iOS
```

## Jak web spustit

**Rychlý náhled:** otevřete `index.html` v prohlížeči. Vše funguje kromě odeslání formuláře – bez serveru
web místo falešného „odesláno“ zobrazí poctivou informaci, že jde o náhled, a nabídne telefon a e-mail.

**Lokálně i s formulářem** (potřebujete PHP):

```
php -S localhost:8000
```

a otevřete `http://localhost:8000`. Pro skutečné doručení e-mailu musí být na počítači nastavená funkce `mail()`;
nejjednodušší je vyzkoušet formulář až na hostingu.

## Nasazení na hosting

1. Nahrajte celou složku na hosting s PHP 7.4+ (Wedos, Forpsi, Active24 apod. – PHP mají v základu).
2. V `poptavka.php` nastavte nahoře:
   - `RECIPIENT` – kam poptávky chodí (teď `info@mmconstruction.cz`),
   - `FROM_ADDRESS` – adresa **z domény webu** (např. `web@markstav.cz`), jinak skončí e-maily ve spamu,
   - `RATE_SALT` – libovolný náhodný řetězec.
3. Pošlete testovací poptávku a zkontrolujte, že dorazila (i do spamu).
4. V `index.html` i `ochrana-osobnich-udaju.html` **smažte řádek `<meta name="robots" content="noindex, nofollow">`**
   (demo je schválně skryté před vyhledávači).
5. Doplňte `<link rel="canonical">` a `og:url` s finální doménou.

### Jak formulář funguje

- Validace v prohlížeči i znovu na serveru (jméno, e-mail, telefon, služba, popis).
- Potvrzení „Poptávka je odeslaná“ se zobrazí **až po odpovědi serveru** (`{"ok": true}`).
  Chyba serveru i výpadek spojení se zobrazí jako srozumitelná hláška s telefonem.
- Ochrana proti spamu: skryté pole pro roboty, minimální doba vyplnění, kontrola původu požadavku,
  limit 5 poptávek za hodinu z jedné IP adresy.
- E-mail má nastavené `Reply-To` na zákazníka – stačí odpovědět.
- Data se nikam neukládají, žádné tajné klíče nejsou v JavaScriptu.
- Funguje i bez JavaScriptu (server vrátí jednoduchou potvrzovací stránku).

Pokud hosting nepodporuje `mail()`, dá se `poptavka.php` přepnout na SMTP (např. knihovna PHPMailer) –
logika validace a odpovědí zůstane stejná.

## Fotografie

**Realizace (galerie, malé náhledy u služeb, fotka v sekci O nás)** – skutečné fotografie z realizací firmy
převzaté z původního webu (sekce „Naše práce“), popisky vychází z jejich původních popisů.
Teď se načítají přímo z úložiště původního webu (Webnode). **Před zrušením starého webu je nutné je stáhnout
do `assets/img/` a přepsat cesty**, jinak přestanou fungovat.

**Ilustrační fotografie** (Unsplash License, volné použití) – nejsou prezentované jako realizace firmy,
hero fotka má popisek „Ilustrační fotografie“ a patička uvádí zdroj:

| Místo | Autor | Odkaz |
|---|---|---|
| Úvodní sekce | Ibrar Tariq | https://unsplash.com/photos/M6a_MWnHJd4 |
| Rekonstrukce | Sasun Bughdaryan | https://unsplash.com/photos/Re1O5byZ8bY |
| Koupelny a obklady | charlesdeluvio | https://unsplash.com/photos/LyQi9DS7AEg |
| Výstavba menších projektů | Auroom Wellness | https://unsplash.com/photos/ZanQz-7MqCM |
| Stavební povolení | Pedro Miranda | https://unsplash.com/photos/3QzMBrvCeyQ |
| Revitalizace exteriéru | Brett Jordan | https://unsplash.com/photos/jEP4vsHrSM8 |

Ilustrační fotky se načítají z CDN Unsplash ve velikosti podle zařízení (WebP/AVIF automaticky).
Ideálně je časem nahradit dalšími fotkami z vlastních realizací.

## Ověřené údaje (zdroj: původní web a ARES)

- Marek Mlčoch, IČO 07790431, fyzická osoba podnikající dle živnostenského zákona
- Sídlo: Kubcova 124/9, 500 04 Hradec Králové
- Telefon: +420 739 510 250, e-mail: info@mmconstruction.cz, Instagram @mmconstructionhk
- Služby podle původního webu: rekonstrukce domů, bytů a komerčních prostor; rekonstrukce koupelen;
  obkladačské práce; výstavba menších projektů (sauny, zahradní domky); zajištění stavebních povolení;
  revitalizace exteriéru. Dílčí činnosti (SDK, zateplení, epoxidové stěrky, podlahové topení, zámková dlažba,
  dlažba na terčích, dřevostavby, garáže, základové desky) vychází z popisků fotek na původním webu.
- Působnost: Hradec Králové a Královéhradecký kraj, částečně Pardubický a Středočeský kraj

Záměrně **neuvedeno** (nedá se ověřit): počet let praxe, počet zakázek, velikost týmu, certifikace,
hodnocení, záruky, otevírací doba. Lze doplnit, pokud je klient potvrdí.

## K ověření s klientem

- **Název značky:** markstav.cz dnes přesměrovává na mmconstruction.cz („M&M construction“), e-mail je
  info@mmconstruction.cz. Demo používá značku MARKSTAV podle zadání – potvrdit, pod kterým názvem chce
  klient vystupovat a na jaké doméně web poběží.
- Zda chce v kontaktech uvádět adresu sídla (u OSVČ často bydliště).
- Průběh spolupráce (4 kroky v sekci Postup) – obecný popis, potvrdit, že odpovídá jeho praxi.
- Text zásad zpracování osobních údajů je návrh – hlavně doba uchování poptávek (12 měsíců).
- Výběr fotek do galerie – případně dodat lepší fotky hotových prací.

## Technické poznámky

- Barvy: grafit `#252724`, slonová kost `#F5F2EC`, písek `#D9CCB9`, bronz `#A77B50`, bílá.
  Pro malý akcentní text se používá tmavší bronz `#835A33` (kontrast 5,4 : 1).
- Písmo Archivo (variabilní, řez i šířka) je uložené lokálně – žádné Google Fonts, žádné cookies.
- Animace respektují `prefers-reduced-motion`; obsah je čitelný i bez JavaScriptu.
- Otestováno v Chromiu na šířkách 320–1920 px (bez vodorovného posunu), klávesnicí (menu, lightbox,
  formulář), audit přístupnosti axe-core bez chyb, HTML validace, PHP odeslání včetně ochrany proti spamu.
