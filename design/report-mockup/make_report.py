"""
make_report.py — mock-up of a printable SALUS Online run report (PDF).

Builds a 3-page US Letter report for one run from the same results JSON the
web app uses, styled to match the Spartan White UI:
  p1  header, run & field details, management inputs, key results tiles,
      annual summary table
  p2  season charts: nitrogen pools over time, plant-extractable soil water,
      weather & management events
  p3  soil nitrate profile snapshots (depth on x-axis, like the app) + notes

Usage: python make_report.py <results.json> <out.pdf>
  e.g. python make_report.py ../../public/data/east-lansing-irrigated.json salus-run-report-sample.pdf
The sample PDF in this folder was made from the MOCK irrigated data.
"""
import io
import json
import sys
from datetime import date, datetime

import matplotlib
matplotlib.use("Agg")
import matplotlib.dates as mdates
import matplotlib.pyplot as plt
from matplotlib import font_manager
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (Image, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table,
                                TableStyle)

# ---------- brand tokens (mirror src/theme/tokens.ts) ----------
SPARTAN = "#18453B"
KELLY = "#008208"
SURFACE = "#E8F0EC"
AMBER = "#C17A00"
CANVAS = "#F0F4EF"
BORDER = "#DCE3DE"
TEXT = "#1B2420"
MUTED = "#5B6B63"
RAIN, IRR, FERT = "#2F6FB5", "#0E8A8A", "#C8431F"
DEPTH = ["#F7B23B", "#F0961D", "#E5651C", "#C9461F", "#A5331C", "#83281A", "#6B2418", "#552018", "#401C17", "#2C1814"]
MAXGREEN = "#6FA77F"

# ---------- fonts: Metropolis (MSU brand sans) ----------
for w in ("400", "600", "700", "800"):
    pdfmetrics.registerFont(TTFont(f"Metro-{w}", f"fonts/Metropolis-{w}.ttf"))
    font_manager.fontManager.addfont(f"fonts/Metropolis-{w}.ttf")
plt.rcParams.update({
    "font.family": "Metropolis", "font.size": 8.5, "axes.edgecolor": "#9AA8A0", "axes.labelcolor": MUTED,
    "xtick.color": MUTED, "ytick.color": MUTED, "axes.spines.top": False, "axes.spines.right": False,
    "axes.grid": True, "grid.color": BORDER, "grid.linewidth": 0.6, "axes.axisbelow": True,
    "legend.frameon": False, "legend.fontsize": 8,
})

ST = {
    "overline": ParagraphStyle("ov", fontName="Metro-700", fontSize=7.5, leading=10, textColor=colors.HexColor(SPARTAN), spaceAfter=2),
    "h1": ParagraphStyle("h1", fontName="Metro-800", fontSize=20, leading=24, textColor=colors.HexColor(SPARTAN)),
    "h2": ParagraphStyle("h2", fontName="Metro-700", fontSize=12, leading=15, textColor=colors.HexColor(SPARTAN), spaceBefore=4, spaceAfter=4),
    "body": ParagraphStyle("b", fontName="Metro-400", fontSize=9, leading=12.5, textColor=colors.HexColor(TEXT)),
    "small": ParagraphStyle("s", fontName="Metro-400", fontSize=7.5, leading=10, textColor=colors.HexColor(MUTED)),
    "cell": ParagraphStyle("c", fontName="Metro-400", fontSize=8.5, leading=11, textColor=colors.HexColor(TEXT)),
    "cellb": ParagraphStyle("cb", fontName="Metro-600", fontSize=8.5, leading=11, textColor=colors.HexColor(TEXT)),
}


def fig_to_image(fig, width_in):
    """Render a matplotlib figure to a crisp PNG flowable of the given width."""
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=220, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    img = Image(buf)
    ratio = img.imageHeight / img.imageWidth
    img.drawWidth, img.drawHeight = width_in * inch, width_in * inch * ratio
    return img


def card(content, width, pad=10, bg="#FFFFFF"):
    """White rounded 'card' like the web UI (1 px border)."""
    t = Table([[content]], colWidths=[width])
    t.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor(BORDER)),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(bg)),
        ("ROUNDEDCORNERS", [6, 6, 6, 6]),
        ("LEFTPADDING", (0, 0), (-1, -1), pad), ("RIGHTPADDING", (0, 0), (-1, -1), pad),
        ("TOPPADDING", (0, 0), (-1, -1), pad), ("BOTTOMPADDING", (0, 0), (-1, -1), pad),
    ]))
    return t


def kv_table(rows, width):
    """Two-column label/value list."""
    data = [[Paragraph(k, ST["small"]), Paragraph(v, ST["cellb"])] for k, v in rows]
    t = Table(data, colWidths=[width * 0.42, width * 0.58])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, colors.HexColor(BORDER)),
        ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
    ]))
    return t


def kpi_tiles(items, width):
    """Row of stat tiles: big amber/green number + label."""
    cells = []
    for value, unit, label, color in items:
        cells.append([
            Paragraph(f'<font name="Metro-800" size="17" color="{color}">{value}</font>'
                      f'<font name="Metro-600" size="8" color="{MUTED}"> {unit}</font>',
                      ParagraphStyle("kpi", parent=ST["body"], leading=21)),
            Spacer(1, 3),
            Paragraph(label, ST["small"]),
        ])
    n = len(items)
    t = Table([cells], colWidths=[width / n] * n)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(SURFACE)),
        ("LINEAFTER", (0, 0), (-2, -1), 2, colors.white),
        ("ROUNDEDCORNERS", [6, 6, 6, 6]),
        ("LEFTPADDING", (0, 0), (-1, -1), 9), ("TOPPADDING", (0, 0), (-1, -1), 9), ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return t


def main(src, out):
    d = json.load(open(src))
    days, events, layers, mx = d["days"], d["events"], d["layers"], d["maximums"]
    run = {
        "name": "Sample run — Irrigated",
        "place": "East Lansing, MI",
        "coords": "42.7055°N, 84.4646°W",
        "dataset": "Irrigated corn (mock sample data)",
        "years": f"{days[0]['date'][:4]}–{days[-1]['date'][:4]}",
        "created": "Oct 9, 2026",
        "notes": "Same field with automatic irrigation. Higher uptake, but watch for leaching after heavy water.",
    }
    mgmt = [
        ("Soil texture", "Silty Clay"), ("Soil depth", 'Deep (more than 40")'), ("Tillage", "No tillage"),
        ("Crop", "Corn for grain, 100-day hybrid"), ("Plant population", "38,000 seeds/acre"),
        ("Planting date", "May 1"), ("Irrigation", "Yes (automatic)"), ("Inorganic N", "150 lbs/acre (actual N)"),
        ("Cover crop / manure", "No / No"),
    ]

    # ---------- derived numbers ----------
    dts = [datetime.strptime(x["date"], "%Y-%m-%d") for x in days]
    years = sorted({x["date"][:4] for x in days})
    annual = []
    prev_plant, prev_leach = 0.0, 0.0
    for y in years:
        ds = [x for x in days if x["date"].startswith(y)]
        ev = [e for e in events if e["date"].startswith(y)]
        plant_end, leach_end = ds[-1]["plantN"], ds[-1]["leachN"]
        annual.append({
            "year": y,
            "rain": sum(e["rain"] for e in ev), "irr": sum(e["irrigation"] for e in ev),
            "fert": sum(e["fertilizer"] for e in ev),
            "uptake": plant_end - prev_plant, "leach": leach_end - prev_leach,
            "soil_end": ds[-1]["soilN"], "pesw_min": min(x["pesw"] for x in ds),
        })
        prev_plant, prev_leach = plant_end, leach_end
    tot = {k: sum(a[k] for a in annual) for k in ("rain", "irr", "fert", "uptake", "leach")}

    # ---------- page furniture ----------
    W, H = letter
    M = 0.6 * inch
    CW = W - 2 * M
    generated = date(2026, 10, 9).strftime("%B %-d, %Y")

    def furniture(c, doc):
        c.saveState()
        c.setFillColor(colors.white)
        c.rect(0, H - 0.78 * inch, W, 0.78 * inch, stroke=0, fill=1)
        c.drawImage("logo.png", M, H - 0.64 * inch, width=0.42 * inch, height=0.40 * inch, mask="auto")
        c.setFillColor(colors.HexColor(SPARTAN))
        c.setFont("Metro-800", 14)
        c.drawString(M + 0.52 * inch, H - 0.43 * inch, "SALUS Online")
        c.setFont("Metro-400", 7.5)
        c.setFillColor(colors.HexColor(MUTED))
        c.drawString(M + 0.52 * inch, H - 0.57 * inch, "Crop, nitrogen & water simulation · Michigan State University")
        c.setFont("Metro-600", 8)
        c.drawRightString(W - M, H - 0.43 * inch, "RUN REPORT")
        c.setFont("Metro-400", 7.5)
        c.drawRightString(W - M, H - 0.57 * inch, run["name"])
        c.setStrokeColor(colors.HexColor(SPARTAN))
        c.setLineWidth(2.2)
        c.line(0, H - 0.78 * inch, W, H - 0.78 * inch)
        # footer
        c.setStrokeColor(colors.HexColor(BORDER))
        c.setLineWidth(0.6)
        c.line(M, 0.55 * inch, W - M, 0.55 * inch)
        c.setFont("Metro-400", 7)
        c.setFillColor(colors.HexColor(MUTED))
        c.drawString(M, 0.38 * inch, f"Generated {generated} · Demo mode: mock sample results, not SALUS output")
        c.drawRightString(W - M, 0.38 * inch, f"Page {doc.page}")
        c.restoreState()

    doc = SimpleDocTemplate(out, pagesize=letter, leftMargin=M, rightMargin=M, topMargin=1.0 * inch, bottomMargin=0.8 * inch,
                            title=f"SALUS Online run report — {run['name']}", author="SALUS Online, Basso Lab MSU")
    s = []

    # ===== PAGE 1 =====
    s.append(Paragraph("SELECTED FIELD RESULTS", ST["overline"]))
    s.append(Paragraph(run["name"], ST["h1"]))
    s.append(Spacer(1, 3))
    chips = " &nbsp; ".join(f'<font backColor="{SURFACE}" color="{SPARTAN}">&nbsp;{t}&nbsp;</font>'
                            for t in [run["place"], "Silty Clay", "Irrigated", "150 lb N/ac", run["years"]])
    s.append(Paragraph(chips, ParagraphStyle("chips", parent=ST["cellb"], fontSize=8, leading=14)))
    s.append(Paragraph(run["notes"], ST["small"]))
    s.append(Spacer(1, 10))

    half = (CW - 12) / 2
    left = [Paragraph("RUN & FIELD", ST["overline"]), kv_table([
        ("Location", f"{run['place']}<br/>{run['coords']}"), ("Dataset", run["dataset"]),
        ("Simulation period", f"{run['years']} ({len(years)} seasons)"), ("Run created", run["created"]),
    ], half - 20)]
    right = [Paragraph("SET MANAGEMENT", ST["overline"]), kv_table(mgmt, half - 20)]
    two = Table([[card(left, half), card(right, half)]], colWidths=[half + 6, half + 6])
    two.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))
    s.append(two)
    s.append(Spacer(1, 12))

    s.append(Paragraph("Key results, whole run", ST["h2"]))
    s.append(kpi_tiles([
        (f"{tot['uptake']:,.0f}", "kg N/ha", "Plant N uptake", AMBER),
        (f"{tot['leach']:,.1f}", "kg N/ha", "Nitrate leached", FERT),
        (f"{tot['fert']:,.0f}", "kg N/ha", "Fertilizer N applied", SPARTAN),
        (f"{tot['rain']:,.0f}", "mm", "Rainfall", RAIN),
        (f"{tot['irr']:,.0f}", "mm", "Irrigation", IRR),
    ], CW))
    s.append(Spacer(1, 12))

    s.append(Paragraph("Season by season", ST["h2"]))
    hdr = ["Year", "Rain\n(mm)", "Irrigation\n(mm)", "Fertilizer N\n(kg/ha)", "Plant N uptake\n(kg/ha)",
           "N leached\n(kg/ha)", "Soil nitrate\nDec 31 (kg/ha)", "Lowest PESW\n(mm)"]
    rows = [[Paragraph(h.replace("\n", "<br/>"), ParagraphStyle("th", parent=ST["small"], fontName="Metro-700", textColor=colors.HexColor(SPARTAN))) for h in hdr]]
    for a in annual:
        rows.append([a["year"], f"{a['rain']:,.0f}", f"{a['irr']:,.0f}", f"{a['fert']:,.0f}", f"{a['uptake']:,.0f}",
                     f"{a['leach']:,.1f}", f"{a['soil_end']:,.0f}", f"{a['pesw_min']:,.0f}"])
    rows.append(["Total", f"{tot['rain']:,.0f}", f"{tot['irr']:,.0f}", f"{tot['fert']:,.0f}", f"{tot['uptake']:,.0f}",
                 f"{tot['leach']:,.1f}", "", ""])
    t = Table(rows, colWidths=[CW * w for w in (0.08, 0.1, 0.12, 0.13, 0.15, 0.12, 0.16, 0.14)], repeatRows=1)
    t.setStyle(TableStyle([
        ("FONTNAME", (0, 1), (-1, -1), "Metro-400"), ("FONTSIZE", (0, 1), (-1, -1), 8.5),
        ("FONTNAME", (0, 1), (0, -1), "Metro-600"), ("FONTNAME", (0, -1), (-1, -1), "Metro-700"),
        ("TEXTCOLOR", (0, 1), (-1, -1), colors.HexColor(TEXT)),
        ("ALIGN", (1, 1), (-1, -1), "RIGHT"), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(CANVAS)),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, colors.HexColor("#FAFBFA")]),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor(SURFACE)),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, colors.HexColor(BORDER)),
        ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor(BORDER)),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    s.append(t)
    s.append(Spacer(1, 6))
    s.append(Paragraph("Plant N uptake and N leached are the increase within each calendar year (SALUS reports them "
                       "as running totals). PESW = plant-extractable soil water.", ST["small"]))
    s.append(PageBreak())

    # ===== PAGE 2: season charts =====
    s.append(Paragraph("How the season unfolded", ST["h2"]))
    s.append(Paragraph("Daily results for the whole simulation (mock sample data). Shaded bands mark each growing season (May–Sep).", ST["small"]))
    s.append(Spacer(1, 8))

    def season_bands(ax):
        for y in years:
            ax.axvspan(datetime(int(y), 5, 1), datetime(int(y), 9, 30), color=SURFACE, lw=0, zorder=0)
        ax.xaxis.set_major_locator(mdates.YearLocator())
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
        ax.set_xlim(dts[0], dts[-1])

    # Chart 1 — nitrogen pools
    fig, ax = plt.subplots(figsize=(7.4, 2.0))
    season_bands(ax)
    ax.plot(dts, [x["soilN"] for x in days], color=SPARTAN, lw=1.3, label="Soil nitrate")
    ax.plot(dts, [x["plantN"] for x in days], color=AMBER, lw=1.6, label="Plant N (cumulative)")
    ax2 = ax.twinx()
    ax2.plot(dts, [x["leachN"] for x in days], color=FERT, lw=1.4, ls="--", label="N leached (cumulative, right axis)")
    ax2.spines["right"].set_visible(True)
    ax2.grid(False)
    ax2.set_ylabel("Leached, kg N/ha", color=FERT)
    ax2.tick_params(axis="y", colors=FERT)
    ax.set_ylabel("kg N/ha")
    h1, l1 = ax.get_legend_handles_labels()
    h2, l2 = ax2.get_legend_handles_labels()
    ax.legend(h1 + h2, l1 + l2, loc="upper left", ncol=3, bbox_to_anchor=(0, 1.16))
    s.append(card([Paragraph("NITROGEN POOLS", ST["overline"]), fig_to_image(fig, 6.7)], CW))
    s.append(Spacer(1, 8))

    # Chart 2 — PESW
    fig, ax = plt.subplots(figsize=(7.4, 1.55))
    season_bands(ax)
    pesw = [x["pesw"] for x in days]
    ax.fill_between(dts, pesw, color=AMBER, alpha=0.25, lw=0)
    ax.plot(dts, pesw, color=AMBER, lw=1.1, label="Plant-extractable soil water")
    ax.axhline(mx["pesw"], color=MAXGREEN, lw=1.2, ls=":", label=f"Run maximum ({mx['pesw']:.0f} mm)")
    ax.set_ylabel("mm")
    ax.set_ylim(0, mx["pesw"] * 1.12)
    ax.legend(loc="upper left", ncol=2, bbox_to_anchor=(0, 1.2))
    s.append(card([Paragraph("SOIL WATER", ST["overline"]), fig_to_image(fig, 6.7)], CW))
    s.append(Spacer(1, 8))

    # Chart 3 — events
    fig, ax = plt.subplots(figsize=(7.4, 1.55))
    season_bands(ax)
    ed = [datetime.strptime(e["date"], "%Y-%m-%d") for e in events]
    ax.bar(ed, [e["rain"] for e in events], width=1.6, color=RAIN, label="Rain (mm)")
    ax.bar(ed, [e["irrigation"] for e in events], bottom=[e["rain"] for e in events], width=1.6, color=IRR, label="Irrigation (mm)")
    top = max(e["rain"] + e["irrigation"] for e in events) * 1.15
    fert = [(d_, e["fertilizer"]) for d_, e in zip(ed, events) if e["fertilizer"] > 0]
    for d_, v in fert:
        ax.axvline(d_, color=FERT, lw=0.8, ls="--", alpha=0.7)
        ax.text(d_, top * 0.97, f"{v:.0f}", color=FERT, fontsize=6.5, ha="center", va="top",
                bbox=dict(boxstyle="round,pad=0.15", fc="white", ec="none"))
    ax.plot([], [], color=FERT, ls="--", label="Fertilizer N (kg/ha, labelled)")
    ax.set_ylim(0, top)
    ax.set_ylabel("mm")
    ax.legend(loc="upper left", ncol=3, bbox_to_anchor=(0, 1.22))
    s.append(card([Paragraph("WEATHER & MANAGEMENT EVENTS", ST["overline"]), fig_to_image(fig, 6.7)], CW))
    s.append(PageBreak())

    # ===== PAGE 3: nitrate profiles =====
    s.append(Paragraph("Soil nitrate profile snapshots", ST["h2"]))
    s.append(Paragraph("Nitrate-N concentration by soil layer on key dates each year. Depth runs left to right, as in "
                       "the app. Values above the shared scale are clipped and labelled.", ST["small"]))
    s.append(Spacer(1, 8))
    by_date = {x["date"]: x for x in days}
    snap_md = [("05-01", "May 1 (planting)"), ("07-01", "Jul 1 (mid-season)"), ("10-15", "Oct 15 (harvest)")]
    labels = [f"{l['top']}–{l['bottom']}" for l in layers]
    allvals = sorted(v for y in years for md, _ in snap_md if f"{y}-{md}" in by_date for v in by_date[f"{y}-{md}"]["conc"])
    ymax = max(10, round(allvals[int(len(allvals) * 0.97)] * 1.1 / 10) * 10)
    fig, axes = plt.subplots(len(years), len(snap_md), figsize=(7.4, 1.32 * len(years)), sharey=True, sharex=True)
    for r, y in enumerate(years):
        for c_, (md, title) in enumerate(snap_md):
            ax = axes[r][c_]
            rec = by_date.get(f"{y}-{md}")
            vals = rec["conc"] if rec else [0] * 10
            bars = ax.bar(range(10), [min(v, ymax) for v in vals], color=DEPTH, width=0.75)
            for b, v in zip(bars, vals):
                if v >= ymax * 0.02:
                    ax.text(b.get_x() + b.get_width() / 2, min(v, ymax) + ymax * 0.03, f"{v:.0f}", ha="center", fontsize=5.5, color=MUTED)
            ax.set_ylim(0, ymax * 1.15)
            ax.grid(axis="x", visible=False)
            if r == 0:
                ax.set_title(title, fontsize=8.5, color=SPARTAN, fontweight="bold", loc="left")
            if c_ == 0:
                ax.set_ylabel(f"{y}\nmg N/kg", fontsize=7.5)
            ax.set_xticks(range(10))
            ax.set_xticklabels(labels, rotation=50, ha="right", fontsize=5.8)
            ax.tick_params(axis="y", labelsize=6.5)
    fig.supxlabel("Soil depth (cm)", fontsize=8, color=MUTED, y=0.0)
    fig.tight_layout(h_pad=0.6, w_pad=0.6)
    s.append(card([fig_to_image(fig, 6.6)], CW))
    s.append(Spacer(1, 8))

    notes = [
        "<b>About this report.</b> Generated from SALUS Online. In demo mode, results are mock sample data "
        "(invented numbers, not SALUS output) placed at the MSU Agronomy Farm (East Lansing, MI). Answers that don't change the demo data are recorded "
        "for reference only.",
        "<b>Units.</b> N amounts in kg N/ha (1 kg/ha is about 0.89 lb/acre); water in mm; nitrate concentration in mg N per kg dry soil.",
    ]
    s.append(KeepTogether(card([Paragraph(n, ST["small"]) for n in notes], CW, bg=CANVAS)))

    doc.build(s, onFirstPage=furniture, onLaterPages=furniture)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
