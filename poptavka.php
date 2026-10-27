<?php
/**
 * MARKSTAV – zpracování poptávkového formuláře
 *
 * Funguje na běžném českém hostingu s PHP 7.4+ a funkcí mail().
 * Před spuštěním upravte konfiguraci níže (hlavně FROM_ADDRESS).
 * Žádné tajné klíče se neposílají do prohlížeče – vše běží na serveru.
 */

declare(strict_types=1);

date_default_timezone_set('Europe/Prague');

/* ------------------------------------------------------------------
   KONFIGURACE
   ------------------------------------------------------------------ */
const RECIPIENT       = 'info@mmconstruction.cz';   // kam poptávky chodí
const FROM_ADDRESS    = 'web@markstav.cz';          // odesílatel – MUSÍ být z domény webu (kvůli SPF/DKIM)
const FROM_NAME       = 'Web Markstav';
const SUBJECT_PREFIX  = 'Poptávka z webu';
const USE_ENVELOPE_F  = true;                       // předá -f odesílatele (některé hostingy to nepovolují → false)
const MIN_SECONDS     = 3;                          // rychlejší odeslání = robot
const RATE_LIMIT      = 5;                          // max. poptávek z jedné IP za hodinu
const RATE_WINDOW     = 3600;
const RATE_SALT       = 'zmente-tento-retezec';      // libovolný náhodný řetězec

const SERVICES = [
    'rekonstrukce' => 'Rekonstrukce domu, bytu nebo komerčních prostor',
    'koupelny'     => 'Koupelna a obkladačské práce',
    'vystavba'     => 'Výstavba menšího projektu',
    'povoleni'     => 'Zajištění stavebního povolení',
    'exterier'     => 'Revitalizace exteriéru',
    'jine'         => 'Jiné nebo zatím nevím',
];

/* ------------------------------------------------------------------
   POMOCNÉ FUNKCE
   ------------------------------------------------------------------ */
function wants_json(): bool
{
    $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
    $xrw    = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
    return stripos($accept, 'application/json') !== false || $xrw !== '';
}

function respond(int $status, array $payload): void
{
    http_response_code($status);
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');

    if (wants_json()) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Odeslání bez JavaScriptu – jednoduchá stránka s výsledkem
    header('Content-Type: text/html; charset=utf-8');
    $ok      = !empty($payload['ok']);
    $title   = $ok ? 'Poptávka je odeslaná' : 'Poptávku se nepodařilo odeslat';
    $message = $ok
        ? 'Děkujeme. Ozveme se vám na uvedený e-mail nebo telefon.'
        : ($payload['message'] ?? 'Zkontrolujte prosím vyplněné údaje.');
    if (!$ok && !empty($payload['errors'])) {
        $message .= ' ' . implode(' ', array_map('strval', $payload['errors']));
    }
    $h = static fn(string $s): string => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
    echo '<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
       . '<meta name="robots" content="noindex"><title>' . $h($title) . ' | Markstav</title><link rel="stylesheet" href="style.css"></head>'
       . '<body><main class="section"><div class="container" style="max-width:720px">'
       . '<h1 class="section-title">' . $h($title) . '</h1><p class="lead" style="margin-top:20px">' . $h($message) . '</p>'
       . '<p style="margin-top:20px">Telefon: <a href="tel:+420739510250">+420 739 510 250</a></p>'
       . '<p style="margin-top:32px"><a class="btn btn--primary" href="index.html#kontakt">Zpět na web</a></p>'
       . '</div></main></body></html>';
    exit;
}

function field(string $name, int $max): string
{
    $value = $_POST[$name] ?? '';
    if (!is_string($value)) {
        return '';
    }
    $value = trim(str_replace("\0", '', $value));
    // odstranění neviditelných řídicích znaků (kromě nových řádků a tabulátoru)
    $value = (string) preg_replace('/[^\P{C}\n\t]/u', '', $value);
    return mb_substr($value, 0, $max, 'UTF-8');
}

function single_line(string $value): string
{
    return trim((string) preg_replace('/[\r\n]+/', ' ', $value));
}

function client_ip(): string
{
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

function rate_limited(): bool
{
    $file = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR
          . 'markstav_rl_' . hash('sha256', RATE_SALT . client_ip()) . '.json';
    $now  = time();
    $hits = [];

    if (is_file($file)) {
        $data = json_decode((string) @file_get_contents($file), true);
        if (is_array($data)) {
            $hits = array_values(array_filter($data, static fn($t) => is_int($t) && $t > $now - RATE_WINDOW));
        }
    }
    if (count($hits) >= RATE_LIMIT) {
        return true;
    }
    $hits[] = $now;
    @file_put_contents($file, json_encode($hits), LOCK_EX);
    return false;
}

function encode_header(string $text): string
{
    return '=?UTF-8?B?' . base64_encode($text) . '?=';
}

/* ------------------------------------------------------------------
   ZPRACOVÁNÍ
   ------------------------------------------------------------------ */
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, ['ok' => false, 'message' => 'Formulář odešlete prosím z webové stránky.']);
}

// Požadavek musí přijít ze stejné domény
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$host   = $_SERVER['HTTP_HOST'] ?? '';
if ($origin !== '' && $host !== '' && parse_url($origin, PHP_URL_HOST) !== parse_url('//' . $host, PHP_URL_HOST)) {
    respond(403, ['ok' => false, 'message' => 'Požadavek byl odmítnut.']);
}

if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 20000) {
    respond(413, ['ok' => false, 'message' => 'Zpráva je příliš dlouhá.']);
}

// Ochrana proti spamu: skryté pole a příliš rychlé odeslání.
// Robotovi odpovíme „ok“, aby nezkoušel jiné varianty – e-mail se ale neodešle.
$honeypot = field('website', 200);
$elapsed  = field('elapsed', 10);
if ($honeypot !== '' || ($elapsed !== '' && (int) $elapsed < MIN_SECONDS)) {
    respond(200, ['ok' => true]);
}

$name     = single_line(field('name', 100));
$email    = single_line(field('email', 150));
$phone    = single_line(field('phone', 20));
$location = single_line(field('location', 100));
$service  = field('service', 30);
$message  = field('message', 5000);

$errors = [];
if (mb_strlen($name, 'UTF-8') < 2) {
    $errors['name'] = 'Vyplňte jméno a příjmení.';
}
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Zkontrolujte e-mail – správný tvar je např. jan.novak@email.cz.';
}
if ($phone !== '') {
    $digits = preg_replace('/\D/', '', $phone);
    if (!preg_match('/^\+?[0-9\s()\-]+$/', $phone) || strlen((string) $digits) < 9 || strlen((string) $digits) > 15) {
        $errors['phone'] = 'Telefon zadejte číslicemi, případně s předvolbou +420.';
    }
}
if (!array_key_exists($service, SERVICES)) {
    $errors['service'] = 'Vyberte, o jakou práci jde.';
}
if (mb_strlen($message, 'UTF-8') < 10) {
    $errors['message'] = 'Popište požadavek trochu podrobněji – alespoň 10 znaků.';
}

if ($errors) {
    respond(422, ['ok' => false, 'message' => 'Zkontrolujte prosím zvýrazněná pole.', 'errors' => $errors]);
}

if (rate_limited()) {
    respond(429, ['ok' => false, 'message' => 'Z vaší adresy přišlo v poslední hodině příliš mnoho poptávek.']);
}

/* ------------------------------------------------------------------
   E-MAIL
   ------------------------------------------------------------------ */
$serviceLabel = SERVICES[$service];
$subject      = SUBJECT_PREFIX . ': ' . $serviceLabel . ' – ' . $name;

$body  = "Nová poptávka z webu Markstav\n";
$body .= str_repeat('=', 40) . "\n\n";
$body .= "Jméno:            {$name}\n";
$body .= "E-mail:           {$email}\n";
$body .= 'Telefon:          ' . ($phone !== '' ? $phone : '—') . "\n";
$body .= 'Místo realizace:  ' . ($location !== '' ? $location : '—') . "\n";
$body .= "Služba:           {$serviceLabel}\n\n";
$body .= "Popis požadavku:\n{$message}\n\n";
$body .= str_repeat('-', 40) . "\n";
$body .= 'Odesláno: ' . date('j. n. Y H:i') . "\n";
$body .= "Na tento e-mail můžete rovnou odpovědět – odpověď půjde zákazníkovi.\n";

$headers = [
    'From: ' . encode_header(FROM_NAME) . ' <' . FROM_ADDRESS . '>',
    'Reply-To: ' . encode_header($name) . ' <' . $email . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
];

$sent = USE_ENVELOPE_F
    ? mail(RECIPIENT, encode_header($subject), $body, implode("\r\n", $headers), '-f' . FROM_ADDRESS)
    : mail(RECIPIENT, encode_header($subject), $body, implode("\r\n", $headers));

if (!$sent) {
    respond(500, ['ok' => false, 'message' => 'Poptávku se nepodařilo odeslat kvůli chybě na serveru.']);
}

respond(200, ['ok' => true]);
