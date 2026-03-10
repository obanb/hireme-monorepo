#!/usr/bin/env python3
"""
Generate registration card PDFs (Registrační karta) from bohemia_csv.csv.
Matches the layout of the OREA Congress Hotel Brno registration card.
"""
import csv
import os
import sys
import io

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ── Register fonts with Czech/Unicode support ──────────────────────────────────
def register_fonts():
    font_dir = "C:/Windows/Fonts/"
    fonts = [
        ("Arial",        "arial.ttf"),
        ("Arial-Bold",   "arialbd.ttf"),
        ("Arial-Italic", "ariali.ttf"),
    ]
    for name, fname in fonts:
        path = font_dir + fname
        if os.path.exists(path):
            pdfmetrics.registerFont(TTFont(name, path))
        else:
            # Fallback: DejaVu if available
            alt = font_dir + fname.replace("arial", "DejaVuSans").replace("bd", "-Bold")
            if os.path.exists(alt):
                pdfmetrics.registerFont(TTFont(name, alt))
            else:
                print(f"Warning: font {name} not found, Czech chars may render incorrectly")

register_fonts()

FONT_REG  = "Arial"
FONT_BOLD = "Arial-Bold"
FONT_IT   = "Arial-Italic"


# ── Helpers ────────────────────────────────────────────────────────────────────
def clean(val):
    """Return empty string for NULL / None."""
    if val in ("NULL", "null", None, ""):
        return ""
    return val.strip()


def fmt_date(val):
    """Keep only the YYYY-MM-DD portion."""
    v = clean(val)
    return v[:10] if v else ""


def hex_to_image(hex_str):
    """Convert a 0x-prefixed hex PNG to a ReportLab ImageReader."""
    if not hex_str or not hex_str.startswith("0x"):
        return None
    try:
        data = bytes.fromhex(hex_str[2:])
        return ImageReader(io.BytesIO(data))
    except Exception:
        return None


def safe_name(row, idx):
    """Build a safe filename from the guest name."""
    last  = clean(row.get("lastName", ""))
    first = clean(row.get("firstName", ""))
    raw   = f"{last}_{first}".replace(" ", "_")
    # Strip non-ASCII for safe filenames
    safe  = "".join(c if c.isascii() and (c.isalnum() or c in "_-") else "_" for c in raw)
    return safe if safe.strip("_") else f"guest_{idx + 1}"


# ── Drawing helpers ────────────────────────────────────────────────────────────
def draw_cell(c, x, y, w, h, bg=colors.white, border=True):
    c.setFillColor(bg)
    c.setStrokeColor(colors.HexColor("#aaaaaa"))
    c.rect(x, y - h, w, h, fill=1, stroke=1 if border else 0)


def label(c, x, y, text, font=FONT_REG, size=6):
    c.setFillColor(colors.HexColor("#555555"))
    c.setFont(font, size)
    c.drawString(x, y, text)


def value(c, x, y, text, font=FONT_BOLD, size=9):
    c.setFillColor(colors.black)
    c.setFont(font, size)
    c.drawString(x, y, text)


def checkbox(c, x, y, size=6, checked=False):
    c.setStrokeColor(colors.black)
    c.setFillColor(colors.white)
    c.rect(x, y, size, size, fill=1, stroke=1)
    if checked:
        c.setStrokeColor(colors.black)
        c.setLineWidth(1)
        c.line(x, y, x + size, y + size)
        c.line(x + size, y, x, y + size)
        c.setLineWidth(1)


# ── Main PDF generator ─────────────────────────────────────────────────────────
def generate_pdf(row, output_path):
    c = rl_canvas.Canvas(output_path, pagesize=A4)
    W, H = A4  # 595.28 x 841.89 pt

    ml = 14 * mm   # margin left
    mr = 14 * mm   # margin right
    mt = 14 * mm   # margin top
    cw = W - ml - mr  # content width

    BG_DARK  = colors.HexColor("#1a2340")
    BG_LIGHT = colors.HexColor("#f4f6f9")

    # ── HEADER ──────────────────────────────────────────────────────────────
    hh = 16 * mm
    hy = H - mt - hh
    c.setFillColor(BG_DARK)
    c.rect(ml, hy, cw, hh, fill=1, stroke=0)

    c.setFillColor(colors.white)
    c.setFont(FONT_BOLD, 7)
    c.drawString(ml + 3*mm, hy + hh - 5*mm, "Congress")

    title = "REGISTRAČNÍ KARTA  •  REGISTRATION CARD"
    c.setFont(FONT_BOLD, 10.5)
    tw = c.stringWidth(title, FONT_BOLD, 10.5)
    c.drawString(ml + (cw - tw) / 2, hy + (hh - 10.5) / 2, title)

    y = hy - 1.5*mm  # running cursor (top of next row)

    # ── ROOM NUMBER ─────────────────────────────────────────────────────────
    rh = 9 * mm
    draw_cell(c, ml, y, cw, rh, bg=BG_LIGHT)
    label(c, ml + 2.5*mm, y - 3.5*mm, "Číslo pokoje / Room Number:")
    value(c, ml + 52*mm,  y - 7*mm,   clean(row.get("roomExternalId", "")))
    y -= rh + 1

    # ── GUEST NAME / ADDRESS ─────────────────────────────────────────────────
    rh = 13 * mm
    col1 = cw * 0.55
    col2 = cw * 0.45

    draw_cell(c, ml,        y, col1, rh, bg=colors.white)
    draw_cell(c, ml + col1, y, col2, rh, bg=colors.white)

    label(c, ml + 2*mm,        y - 3.5*mm, "Jméno hosta (příjmení, jméno) / Guest Name (surname, first name):")
    label(c, ml + col1 + 2*mm, y - 3.5*mm, "Adresa / Address:")

    last  = clean(row.get("lastName", ""))
    first = clean(row.get("firstName", ""))
    guest_name = f"{last}, {first}" if last and first else (last or first)

    parts = [clean(row.get("address","")), clean(row.get("city","")),
             clean(row.get("zip","")),     clean(row.get("countryResidenceIso2",""))]
    address = ", ".join(p for p in parts if p)

    value(c, ml + 2*mm,        y - 9.5*mm, guest_name[:55])
    c.setFont(FONT_REG, 8.5)
    c.setFillColor(colors.black)
    c.drawString(ml + col1 + 2*mm, y - 9.5*mm, address[:50])
    y -= rh + 1

    # ── CITIZENSHIP / DATE OF BIRTH ──────────────────────────────────────────
    rh = 10 * mm
    draw_cell(c, ml,        y, col1, rh, bg=BG_LIGHT)
    draw_cell(c, ml + col1, y, col2, rh, bg=BG_LIGHT)

    label(c, ml + 2*mm,        y - 3.5*mm, "Státní občanství / Citizenship:")
    label(c, ml + col1 + 2*mm, y - 3.5*mm, "Datum narození / Date of birth:")

    nat = clean(row.get("nationalityIso3","")) or clean(row.get("nationality",""))
    value(c, ml + 2*mm,        y - 8.5*mm, nat)
    value(c, ml + col1 + 2*mm, y - 8.5*mm, fmt_date(row.get("birthDate","")))
    y -= rh + 1

    # ── PASSPORT / VISA ──────────────────────────────────────────────────────
    rh = 10 * mm
    draw_cell(c, ml,        y, col1, rh, bg=colors.white)
    draw_cell(c, ml + col1, y, col2, rh, bg=colors.white)

    label(c, ml + 2*mm,        y - 3.5*mm, "Číslo pasu (OP) / Passport No. (ID):")
    label(c, ml + col1 + 2*mm, y - 3.5*mm, "Číslo víza / Visa No.:")

    value(c, ml + 2*mm,        y - 8.5*mm, clean(row.get("documentNumber","")))
    value(c, ml + col1 + 2*mm, y - 8.5*mm, clean(row.get("visaNumber","")))
    y -= rh + 1

    # ── EMAIL / CAR PLATE ────────────────────────────────────────────────────
    rh = 10 * mm
    draw_cell(c, ml,        y, col1, rh, bg=BG_LIGHT)
    draw_cell(c, ml + col1, y, col2, rh, bg=BG_LIGHT)

    label(c, ml + 2*mm,        y - 3.5*mm, "E-mail:")
    label(c, ml + col1 + 2*mm, y - 3.5*mm, "SPZ vozidla / Car licence plate:")

    c.setFont(FONT_REG, 8.5)
    c.setFillColor(colors.black)
    c.drawString(ml + 2*mm, y - 8.5*mm, clean(row.get("email","")))
    value(c, ml + col1 + 2*mm, y - 8.5*mm, clean(row.get("carPlateNumber","")))
    y -= rh + 1

    # ── ARRIVAL / DEPARTURE ──────────────────────────────────────────────────
    rh = 10 * mm
    draw_cell(c, ml,        y, col1, rh, bg=colors.white)
    draw_cell(c, ml + col1, y, col2, rh, bg=colors.white)

    label(c, ml + 2*mm,        y - 3.5*mm, "Příjezd / Arrival:")
    label(c, ml + col1 + 2*mm, y - 3.5*mm, "Odjezd / Departure:")

    value(c, ml + 2*mm,        y - 8.5*mm, clean(row.get("timeOfArrival", "")))
    value(c, ml + col1 + 2*mm, y - 8.5*mm, "")   # not in CSV
    y -= rh + 1

    # ── PLACE OF STAY ────────────────────────────────────────────────────────
    rh = 10 * mm
    draw_cell(c, ml, y, cw, rh, bg=BG_LIGHT)
    label(c, ml + 2*mm, y - 3.5*mm, "Místo pobytu / Place of stay:")
    c.setFont(FONT_REG, 8.5)
    c.setFillColor(colors.black)
    c.drawString(ml + 2*mm, y - 8.5*mm,
                 "OREA Congress Hotel Brno, Křížkovského 47, 603 00 Brno 3")
    y -= rh + 1

    # ── PURPOSE OF STAY ──────────────────────────────────────────────────────
    rh = 21 * mm
    draw_cell(c, ml, y, cw, rh, bg=colors.white)
    label(c, ml + 2*mm, y - 3.5*mm, "Důvod pobytu / Purpose of stay:")

    PURPOSE_ITEMS = [
        ["Zdravotní / Medical",  "Služební / Business", "Turistika / Tourist"],
        ["Sportovní / Sport",    "Studium / Study",      "Oficiální / Official"],
        ["Pozvání / Invitation", "Tranzit / Transit",    "Jiné / Other"],
    ]
    PURPOSE_MAP = {
        "600000177": "Turistika / Tourist",
        # add more mappings here if needed
    }
    purpose_code    = clean(row.get("purposeOfStay", ""))
    checked_purpose = PURPOSE_MAP.get(purpose_code, "")

    cb_col = cw / 3
    cb_y = y - 8*mm
    for row_items in PURPOSE_ITEMS:
        for j, item in enumerate(row_items):
            cx = ml + j * cb_col + 2*mm
            checkbox(c, cx, cb_y, size=5.5, checked=(item == checked_purpose))
            c.setFont(FONT_REG, 7)
            c.setFillColor(colors.black)
            c.drawString(cx + 7, cb_y + 0.5, item)
        cb_y -= 5.5*mm
    y -= rh + 1

    # ── CONSENT TEXT ─────────────────────────────────────────────────────────
    rh = 28 * mm
    draw_cell(c, ml, y, cw, rh, bg=BG_LIGHT)

    consents = [
        ("Potvrzuji, že veškeré výše uvedené údaje jsou správné a úplné.",
         "I confirm that all the above-mentioned information is correct and complete."),
        ("Potvrzuji, že jsem se seznámil/a s informací o zpracování mých osobních údajů společností OREA HOTELS s.r.o.",
         "I confirm that I have read and understood the information on the processing of my personal data by OREA HOTELS s.r.o."),
        ("Potvrzuji, že jsem se seznámil/a se ubytovacím řádem a zavazuji se jej dodržovat.",
         "I confirm that I have read the house rules and agree to comply with them."),
        ("Souhlasím s vytvořením uživatelského účtu a podmínkami užívání aplikace MyOrea.",
         "I agree to the creation of a user account and to the terms of use of the MyOrea application."),
    ]
    cy = y - 4.5*mm
    for cs, en in consents:
        c.setFont(FONT_REG, 5.8)
        c.setFillColor(colors.black)
        c.drawString(ml + 2.5*mm, cy, cs)
        cy -= 3*mm
        c.setFont(FONT_IT, 5.8)
        c.setFillColor(colors.HexColor("#444444"))
        c.drawString(ml + 2.5*mm, cy, en)
        cy -= 4*mm
    y -= rh + 1

    # ── SIGNATURE ────────────────────────────────────────────────────────────
    rh = 38 * mm
    draw_cell(c, ml, y, cw, rh, bg=colors.white)
    label(c, ml + 2*mm, y - 3.5*mm, "Podpis hosta / Guest's signature:")

    sig_img = hex_to_image(row.get("Signature", ""))
    if sig_img:
        # Draw signature image, leaving a small padding
        pad = 2 * mm
        img_area_y = y - rh + pad
        img_area_h = rh - 7*mm - pad
        c.drawImage(
            sig_img,
            ml + pad,
            img_area_y,
            width  = cw - 2 * pad,
            height = img_area_h,
            preserveAspectRatio=True,
            anchor="c",
            mask="auto",
        )
    else:
        # Draw a signature line
        c.setStrokeColor(colors.HexColor("#cccccc"))
        c.setLineWidth(0.5)
        c.line(ml + 10*mm, y - rh + 8*mm, ml + cw - 10*mm, y - rh + 8*mm)

    c.save()


# ── Entry point ────────────────────────────────────────────────────────────────
def main():
    csv_path    = "C:/hireme/bohemia_csv.csv"
    output_dir  = "C:/hireme/output_pdfs"
    os.makedirs(output_dir, exist_ok=True)

    with open(csv_path, encoding="utf-8-sig", errors="replace") as f:
        rows = list(csv.DictReader(f))

    total = len(rows)
    print(f"Generating {total} registration card PDFs → {output_dir}")

    errors = 0
    for i, row in enumerate(rows):
        name = safe_name(row, i)
        out  = os.path.join(output_dir, f"{i + 1:04d}_{name}.pdf")
        try:
            generate_pdf(row, out)
            print(f"  [{i+1:4d}/{total}] {os.path.basename(out)}")
        except Exception as e:/
            errors += 1
            print(f"  [{i+1:4d}/{total}] ERROR: {e}")

    print(f"\nDone. {total - errors} OK, {errors} errors.")
    print(f"Output: {output_dir}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
