import type { RegistrationCard } from "../registration-cards/schemas";

// ── Purpose of stay mapping ────────────────────────────────────────────────────

const PURPOSE_MAP: Record<string, string> = {
  "600000177": "tourist",
  "600000001": "business",
  "600000002": "sport",
  "600000003": "medical",
  "600000004": "study",
  "600000005": "official",
  "600000006": "invitation",
  "600000007": "transit",
};

const PURPOSES = [
  { key: "medical",    cz: "Zdravotní",  en: "Medical"   },
  { key: "business",   cz: "Služební",   en: "Business"  },
  { key: "tourist",    cz: "Turistika",  en: "Tourist"   },
  { key: "sport",      cz: "Sportovní",  en: "Sport"     },
  { key: "study",      cz: "Studium",    en: "Study"     },
  { key: "official",   cz: "Oficiální",  en: "Official"  },
  { key: "invitation", cz: "Pozvání",    en: "Invitation"},
  { key: "transit",    cz: "Tranzit",    en: "Transit"   },
  { key: "other",      cz: "Jiné",       en: "Other"     },
];

function checkbox(checked: boolean): string {
  return checked
    ? `<span class="cb checked">&#x2612;</span>`
    : `<span class="cb">&#x2610;</span>`;
}

function field(labelCz: string, labelEn: string, value: string | null | undefined): string {
  return `
    <div class="cell">
      <div class="label">${labelCz} <span class="label-en">/ ${labelEn}:</span></div>
      <div class="value">${value || ""}</div>
    </div>`;
}

export function buildCardHtml(card: RegistrationCard): string {
  const purposeKey = PURPOSE_MAP[card.purposeOfStay ?? ""] ?? "tourist";

  const address = [
    card.street,
    card.city,
    card.countryOfResidence,
  ].filter(Boolean).join(", ");

  const placeOfStay = [
    card.hotel.name,
    card.hotel.street,
    `${card.hotel.zip ?? ""} ${card.hotel.city ?? ""}`.trim(),
  ].filter(Boolean).join(",  ");

  // All 9 purposes rendered flat — CSS grid handles the 3-column layout
  const purposeItems = PURPOSES.map(p =>
    `<div class="purpose-item">
      ${checkbox(p.key === purposeKey)}
      <span><strong>${p.cz}</strong> / ${p.en}</span>
    </div>`
  );

  return `<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10pt;
    color: #000;
    background: #fff;
    padding: 18mm 16mm 14mm;
    width: 210mm;
    min-height: 297mm;
  }

  /* ── Logo ── */
  .logo-wrap {
    text-align: center;
    margin-bottom: 6mm;
  }
  .logo-orea {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 22pt;
    letter-spacing: 0.25em;
    font-weight: normal;
    color: #000;
  }
  .logo-orea .dash { font-size: 14pt; letter-spacing: 0; vertical-align: middle; }
  .logo-sub {
    font-size: 8pt;
    letter-spacing: 0.15em;
    color: #333;
    margin-top: 1mm;
  }

  /* ── Title ── */
  .hotel-name {
    text-align: center;
    font-size: 16pt;
    font-weight: bold;
    margin-bottom: 1mm;
  }
  .card-title {
    text-align: center;
    font-size: 14pt;
    font-weight: bold;
    letter-spacing: 0.03em;
    margin-bottom: 5mm;
  }

  /* ── Room number ── */
  .room-line {
    font-size: 10.5pt;
    margin-bottom: 3mm;
  }
  .room-line strong { font-weight: bold; }
  .room-line .label-part { font-weight: normal; color: #333; }

  /* ── Data table ── */
  .data-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 4mm;
  }
  .data-table td {
    border: 1px solid #000;
    padding: 1.5mm 2.5mm;
    vertical-align: top;
  }
  .label {
    font-size: 8pt;
    font-weight: bold;
    color: #000;
    margin-bottom: 1mm;
  }
  .label-en {
    font-weight: normal;
    color: #444;
  }
  .value {
    font-size: 11pt;
    font-weight: bold;
    color: #000;
    padding-top: 0.5mm;
  }

  /* ── Purpose of stay ── */
  .purpose-section {
    border: 1px solid #000;
    border-top: none;
    padding: 2mm 2.5mm 2.5mm;
    margin-bottom: 5mm;
  }
  .purpose-label {
    font-size: 8pt;
    font-weight: bold;
    margin-bottom: 2mm;
  }
  .purpose-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    row-gap: 1.5mm;
  }
  .purpose-item {
    display: flex;
    align-items: center;
    gap: 2mm;
    font-size: 9pt;
  }

  /* ── Checkboxes ── */
  .cb {
    font-size: 14pt;
    line-height: 1;
    display: inline-block;
    width: 5mm;
    text-align: center;
    flex-shrink: 0;
  }
  .cb.checked { color: #000; }

  /* ── Confirmations ── */
  .confirmations {
    margin-bottom: 6mm;
  }
  .confirm-row {
    display: flex;
    align-items: flex-start;
    gap: 3mm;
    margin-bottom: 3mm;
  }
  .confirm-text {
    font-size: 9pt;
    line-height: 1.45;
  }
  .confirm-text strong { font-size: 9.5pt; }
  .confirm-text .sub {
    color: #333;
    font-size: 8.5pt;
  }

  /* ── Signature ── */
  .signature-section {
    margin-top: 6mm;
  }
  .signature-label {
    font-size: 11pt;
    font-weight: bold;
    margin-bottom: 5mm;
  }
  .signature-name {
    font-family: 'Brush Script MT', 'Segoe Script', cursive;
    font-size: 18pt;
    color: #222;
    margin-left: 8mm;
  }
</style>
</head>
<body>

  <!-- Logo -->
  <div class="logo-wrap">
    <div class="logo-orea">O<span class="dash">&#x2014;</span>R<span class="dash">&#x2014;</span>E<span class="dash">&#x2014;</span>A</div>
    <div class="logo-sub">Hotels &amp; Resorts</div>
  </div>

  <!-- Title -->
  <div class="hotel-name">${card.hotel.nameShort}</div>
  <div class="card-title">REGISTRA&#268;N&#205; KARTA &bull; REGISTRATION CARD</div>

  <!-- Room number -->
  <div class="room-line">
    <strong>&#268;&#237;slo pokoje</strong>
    <span class="label-part"> / Room Number:</span>
    <strong> ${card.room ?? "—"}</strong>
  </div>

  <!-- Guest data table -->
  <table class="data-table">
    <tr>
      <td style="width:50%">${field("Jméno hosta (příjmení, jméno)", "Guest Name (surname, first name)", `${card.surname}, ${card.firstname}`)}</td>
      <td style="width:50%">${field("Adresa", "Address", address)}</td>
    </tr>
    <tr>
      <td>${field("Státní občanství", "Citizenship", card.nationality)}</td>
      <td>${field("Datum narození", "Date of birth", card.dateOfBirth)}</td>
    </tr>
    <tr>
      <td>${field("Číslo pasu (OP)", "Passport No. (ID)", card.documentNumber)}</td>
      <td>${field("Číslo víza", "Visa No.", card.visaNumber)}</td>
    </tr>
    <tr>
      <td>${field("E-mail", "E-mail", card.email)}</td>
      <td>${field("SPZ vozidla", "Car licence plate", card.carPlate)}</td>
    </tr>
    <tr>
      <td>${field("Příjezd", "Arrival", card.arrival)}</td>
      <td>${field("Odjezd", "Departure", card.departure)}</td>
    </tr>
    <tr>
      <td colspan="2">${field("Místo pobytu", "Place of stay", placeOfStay)}</td>
    </tr>
  </table>

  <!-- Purpose of stay -->
  <div class="purpose-section">
    <div class="purpose-label">Důvod pobytu <span style="font-weight:normal;color:#444">/ Purpose of stay:</span></div>
    <div class="purpose-grid">
      ${purposeItems.join("\n      ")}
    </div>
  </div>

  <!-- Confirmations -->
  <div class="confirmations">
    <div class="confirm-row">
      ${checkbox(card.isDataConfirmed)}
      <div class="confirm-text">
        <strong>Potvrzuji, že veškeré výše uvedené údaje jsou správné a úplné.</strong><br>
        <span class="sub">I confirm that all the above-mentioned information is correct and complete.</span>
      </div>
    </div>
    <div class="confirm-row">
      ${checkbox(card.isGDPRRead)}
      <div class="confirm-text">
        <strong>Potvrzuji, že jsem se seznámil/a s informací o zpracování mých osobních údajů společnosti OREA HOTELS s.r.o.</strong><br>
        <span class="sub">I confirm that I have read and understood the information on the processing of my personal data by OREA HOTELS s.r.o.</span>
      </div>
    </div>
    <div class="confirm-row">
      ${checkbox(card.isHouseRulesAccepted)}
      <div class="confirm-text">
        <strong>Potvrzuji, že jsem se seznámil/a jsem se ubytovacím řádem a zavazuji se jej dodržovat.</strong><br>
        <span class="sub">I confirm that I have read the house rules and agree to comply with them.</span>
      </div>
    </div>
    <div class="confirm-row">
      ${checkbox(false)}
      <div class="confirm-text">
        <strong>Souhlasím s vytvořením uživatelského účtu a podmínkami užívání aplikace MyOrea.</strong><br>
        <span class="sub">I agree to the creation of a user account and to the terms of use of the MyOrea application.</span>
      </div>
    </div>
  </div>

  <!-- Signature -->
  <div class="signature-section">
    <div class="signature-label">Podpis hosta / Guest&#x27;s signature:</div>
    <div class="signature-name">${card.firstname} ${card.surname}</div>
  </div>

</body>
</html>`;
}
