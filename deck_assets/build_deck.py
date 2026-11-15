# Builds the English presentation deck (16:9) for BLACK HOLE LAB.
# All numbers verified against src/lib/lab-data.ts + src/lib/physics.ts (see _dom.txt captures).
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from PIL import Image
import os

D = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(D, "black-hole-lab_presentation.pptx")

# 16:9
prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
BLANK = prs.slide_layouts[6]

INK = RGBColor(0xE8, 0xE6, 0xE3)
MUT = RGBColor(0x9A, 0x9F, 0xA8)
ACC = RGBColor(0xFF, 0xA5, 0x00)   # signal orange (app accent)
GRN = RGBColor(0x34, 0xD3, 0x99)   # emerald (within-1sigma)
BG  = RGBColor(0x0B, 0x0D, 0x12)   # deep space black
PANEL = RGBColor(0x14, 0x17, 0x1F)

def add_slide():
    s = prs.slides.add_slide(BLANK)
    bg = s.shapes.add_shape(1, 0, 0, prs.slide_width, prs.slide_height)  # rectangle
    bg.fill.solid(); bg.fill.fore_color.rgb = BG
    bg.line.fill.background()
    bg.shadow.inherit = False
    return s

def txt(s, x, y, w, h, runs, size=18, color=INK, bold=False, align=PP_ALIGN.LEFT, font="Segoe UI", line=1.12, space_after=6):
    """runs: str or list of (text, dict-overrides) tuples."""
    tb = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = 0; tf.margin_top = 0; tf.margin_right = 0; tf.margin_bottom = 0
    items = runs if isinstance(runs, list) else [(runs, {})]
    p = tf.paragraphs[0]
    p.alignment = align
    p.line_spacing = line
    p.space_after = Pt(space_after)
    for t, ov in items:
        r = p.add_run(); r.text = t
        f = r.font
        f.size = Pt(ov.get("size", size))
        f.bold = ov.get("bold", bold)
        f.color.rgb = ov.get("color", color)
        f.name = ov.get("font", font)
    return tb

def mono(s, x, y, w, h, runs, size=13, color=MUT, align=PP_ALIGN.LEFT, line=1.25):
    return txt(s, x, y, w, h, runs, size=size, color=color, align=align,
               font="Consolas", line=line, space_after=4)

def rule(s, x, y, w, color=ACC, weight=1.2):
    ln = s.shapes.add_connector(1, Inches(x), Inches(y), Inches(x+w), Inches(y))
    ln.line.color.rgb = color
    ln.line.width = Pt(weight)
    return ln

def pic(s, path, x, y, w=None, h=None, border=True):
    im = Image.open(path)
    ar = im.width / im.height
    if w is None: w = h * ar
    if h is None: h = w / ar
    ph = s.shapes.add_picture(path, Inches(x), Inches(y), Inches(w), Inches(h))
    if border:
        ph.line.color.rgb = RGBColor(0x3A, 0x3F, 0x4A)
        ph.line.width = Pt(1)
    return ph

def kicker(s, x, y, label, num=None):
    if num:
        txt(s, x, y, 0.6, 0.3, num, size=11, color=ACC, bold=True, font="Consolas")
        x2 = x + 0.55
    else:
        x2 = x
    txt(s, x2, y, 6.5, 0.3, label, size=11, color=MUT, bold=False, font="Consolas")

def title(s, x, y, w, t, size=30):
    txt(s, x, y, w, 0.9, t, size=size, bold=True, color=INK, line=1.02)

# ---------------------------------------------------------------- 1 · COVER
s = add_slide()
# hero image: live 3D scene, right half
pic(s, os.path.join(D, "asset_cover.png"), 6.35, 0.62, w=6.35, h=4.05)
txt(s, 6.35, 4.78, 6.35, 0.32, "LIVE RENDER · KERR SPACETIME, M87* PRESET · M = 6.5×10⁹ M☉, a* = 0.90",
    size=9.5, color=MUT, font="Consolas")
kicker(s, 0.7, 0.85, "ASTROPHYSICS LABORATORY · WEB APP")
txt(s, 0.7, 1.35, 5.4, 2.6, [("BLACK HOLE\n", {"size": 54, "bold": True, "color": INK}),
                              ("LAB", {"size": 54, "bold": True, "color": ACC})], line=1.0, space_after=0)
txt(s, 0.7, 3.05, 5.4, 1.4,
    "From first-principles Kerr general relativity to the published Event Horizon Telescope measurements — every number computed live, none hard-coded.",
    size=15.5, color=MUT, line=1.3)
rule(s, 0.7, 4.35, 2.2)
mono(s, 0.7, 4.62, 5.4, 2.2, [
    ("ENGINE   ", {"color": ACC}), ("Exact Kerr metric · quadrature + RK4 geodesic integrator (in-browser)\n", {}),
    ("VALIDATED ", {"color": ACC}), ("M87* 0.98σ · Sgr A* 0.47σ · S2 precession within 1σ\n", {}),
    ("STACK     ", {"color": ACC}), ("TypeScript · TanStack Start · WebGL · Edge deployment", {}),
], size=12.5)

# ------------------------------------------------------- 2 · THE PROBLEM
s = add_slide()
kicker(s, 0.7, 0.6, "THE PROBLEM", "01")
title(s, 0.7, 1.0, 11.9, "Black hole physics is invisible to its audience", size=31)
rule(s, 0.7, 1.85, 2.2)
txt(s, 0.7, 2.25, 5.9, 3.4,
    [("Simulators are toy visualizations: ", {"bold": True}),
     ("pretty rings, arbitrary numbers, no physics underneath. Textbooks are the opposite: "
      "exact equations, zero visual intuition. Neither lets a student or scientist ask "
      "\u201cwhat does spin actually do to the shadow?\u201d and get a trustworthy answer.", {})],
    size=15.5, color=MUT, line=1.35)
mono(s, 0.7, 4.35, 5.9, 2.4, [
    ("• ", {"color": ACC}), ("EHT publishes one number per target — a shadow diameter in μas\n", {}),
    ("• ", {"color": ACC}), ("S2 star precession: 27-year VLT/GRAVITY campaign, one arcsec-scale fit\n", {}),
    ("• ", {"color": ACC}), ("No consumer-grade tool recomputes either from the metric itself", {}),
], size=13)
pic(s, os.path.join(D, "asset_sgra.png"), 6.9, 2.0, w=5.75, h=3.67)
txt(s, 6.9, 5.75, 5.75, 0.3, "Sgr A* PRESET · M = 4.297×10⁶ M☉ · GALACTIC CENTER · SHADOW ≈ 52.9 μas (ENGINE)",
    size=9.5, color=MUT, font="Consolas")

# ---------------------------------------------------- 3 · THE SOLUTION
s = add_slide()
kicker(s, 0.7, 0.6, "THE SOLUTION", "02")
title(s, 0.7, 1.0, 11.9, "A laboratory, not a movie: the metric is the engine", size=31)
rule(s, 0.7, 1.85, 2.2)
cols = [
    ("1 · INPUT", "Pick an observed target (M87*, Sgr A*, Cygnus X-1) or drag mass, spin, distance, inclination sliders — NASA archive presets."),
    ("2 · PHYSICS", "Every observable recomputed live from the exact Kerr metric: horizons, ergosphere, photon sphere, ISCO, deflection, time dilation, Hawking temperature, entropy."),
    ("3 · EVIDENCE", "The simulated shadow is overlaid on the real EHT published measurements and scored against them, target by target."),
]
for i, (h, b) in enumerate(cols):
    x = 0.7 + i * 4.05
    txt(s, x, 2.3, 3.7, 0.4, h, size=15, color=ACC, bold=True, font="Consolas")
    txt(s, x, 2.78, 3.7, 2.4, b, size=13, color=MUT, line=1.3)
rule(s, 0.7, 5.35, 11.93, color=RGBColor(0x3A,0x3F,0x4A), weight=0.75)
mono(s, 0.7, 5.6, 11.9, 1.4, [
    ("16 observables · 22 engine modules · Kerr metric — exact analytic results (Bardeen 1973, Bardeen–Press–Teukolsky 1972, Hawking 1974) ", {}),
    ("or numerically cross-checked. No fitted parameters.", {"color": INK}),
], size=12.5)

# ------------------------------------------- 4 · EVIDENCE I — EHT SHADOWS
s = add_slide()
kicker(s, 0.7, 0.6, "EVIDENCE I · EVENT HORIZON TELESCOPE", "03")
title(s, 0.7, 1.0, 11.9, "The engine meets the real images — within 1σ, twice", size=30)
rule(s, 0.7, 1.85, 2.2)
pic(s, os.path.join(D, "asset_eht_panel.png"), 0.7, 2.25, w=5.9)
# right: scoreboard table rendered as text
rows = [
    ("TARGET", "ENGINE μas", "EHT μas", "Δσ"),
    ("M87*", "39.0", "42.0 ± 3.0", "0.98"),
    ("Sagittarius A*", "52.9", "51.8 ± 2.3", "0.47"),
]
ty = 2.45
tx = 7.05
cw = [2.6, 1.35, 1.75, 0.75]
for ri, r in enumerate(rows):
    x = tx
    for ci, cell in enumerate(r):
        if ri == 0:
            txt(s, x, ty, cw[ci], 0.3, cell, size=11, color=MUT, font="Consolas", bold=True)
        elif ci == 0:
            txt(s, x, ty, cw[ci], 0.3, cell, size=13.5, color=INK, font="Consolas", bold=True)
        elif ci == 3:
            txt(s, x, ty, cw[ci], 0.3, cell, size=13.5, color=GRN, font="Consolas", bold=True)
        else:
            txt(s, x, ty, cw[ci], 0.3, cell, size=13.5, color=INK, font="Consolas")
        x += cw[ci]
    ty += 0.42
rule(s, tx, 2.32, 6.45, color=RGBColor(0x3A,0x3F,0x4A), weight=0.75)
rule(s, tx, ty-0.05, 6.45, color=RGBColor(0x3A,0x3F,0x4A), weight=0.75)
mono(s, tx, ty+0.15, 6.3, 2.6, [
    ("BOTH targets within the published 1σ band — ", {"color": GRN}),
    ("the same engine, no per-target tuning.\n", {}),
    ("Residuals: M87* −3.0 μas (7.0%), Sgr A* +1.1 μas (2.1%).", {}),
], size=12.5)
mono(s, tx, ty+1.15, 6.3, 1.6, [
    ("Shadow formula: D ≈ 2√27 · (1 − 0.02 a*²) · r_g / D_obs — exact Kerr ", {}),
    ("spherical-photon family, inclination-averaged per EHT convention.", {"color": MUT}),
], size=12.5)

# --------------------------------------- 5 · EVIDENCE II — S2 PRECESSION
s = add_slide()
kicker(s, 0.7, 0.6, "EVIDENCE II · GALACTIC CENTER", "04")
title(s, 0.7, 1.0, 11.9, "A second, independent confirmation: the S2 star", size=30)
rule(s, 0.7, 1.85, 2.2)
# left: prediction vs measurement, big numbers
txt(s, 0.7, 2.4, 5.7, 0.5, "GR PREDICTION · THIS ENGINE", size=12, color=MUT, font="Consolas")
txt(s, 0.7, 2.85, 5.7, 1.0, "12.5′ per orbit", size=40, bold=True, color=INK)
mono(s, 0.7, 4.05, 5.7, 1.0,
     "Δω = 6πGM / c²a(1−e²) · a = 1003 AU · e = 0.884", size=12.5)
rule(s, 0.7, 4.85, 2.2, color=RGBColor(0x3A,0x3F,0x4A), weight=0.75)
txt(s, 0.7, 5.1, 5.7, 0.5, "VLT/GRAVITY 2020 MEASUREMENT", size=12, color=MUT, font="Consolas")
txt(s, 0.7, 5.55, 5.7, 1.0, [("f", {"size": 30, "bold": True, "color": INK}),
                              ("SP", {"size": 16, "bold": True, "color": INK}),
                              (" = 1.10 ± 0.19", {"size": 30, "bold": True, "color": INK})])
# right: explanation + status
txt(s, 6.9, 2.4, 5.7, 2.6,
    [("The S2 star swings past Sagittarius A* every 16 years. Relativity predicts its orbit should fail to close, ", {}),
     ("advancing 12.5 arc-minutes per revolution. ", {"bold": True, "color": INK}),
     ("The VLT/GRAVITY campaign measured exactly this Schwarzschild precession — the work behind the 2020 Nobel Prize in Physics.", {})],
    size=14, color=MUT, line=1.35)
mono(s, 6.9, 4.6, 5.7, 1.2, [
    ("STATUS  ", {"color": GRN, "bold": True}),
    ("Pure GR inside the published 1σ band — ", {"color": GRN}),
    ("second independent confirmation of the same engine.", {"color": MUT}),
], size=13)
mono(s, 6.9, 5.5, 5.7, 0.8, "The engine computes the advance from first principles; f_SP is published, not fitted.", size=12.5, color=MUT)

# --------------------------------------------------- 6 · SCALE ANCHORS
s = add_slide()
kicker(s, 0.7, 0.6, "WHY IT LANDS · HUMAN-SCALE ANCHORS", "05")
title(s, 0.7, 1.0, 11.9, "Physics you can hold: shadows measured in Solar System units", size=29)
rule(s, 0.7, 1.85, 2.2)
cards = [
    ("M87*", "11× Neptune's orbit", "The shadow's edge-to-edge diameter spans the entire Solar System — computed from M, spin and distance, live.", ACC),
    ("Sgr A*", "65.5 million km", "The Galactic Center shadow would enclose Mercury's orbit more than half over — inside our own galaxy.", ACC),
    ("Cygnus X-1", "319 km", "A stellar-mass black hole's shadow — a city-sized region compressed below its own horizon.", ACC),
]
for i, (name, big, body, col) in enumerate(cards):
    x = 0.7 + i * 4.15
    panel = s.shapes.add_shape(1, Inches(x), Inches(2.35), Inches(3.85), Inches(3.9))
    panel.fill.solid(); panel.fill.fore_color.rgb = PANEL
    panel.line.color.rgb = RGBColor(0x2A, 0x2E, 0x38); panel.line.width = Pt(1)
    panel.shadow.inherit = False
    txt(s, x+0.35, 2.7, 3.2, 0.35, name, size=15, color=MUT, font="Consolas", bold=True)
    txt(s, x+0.35, 3.15, 3.2, 1.0, big, size=25, bold=True, color=col)
    txt(s, x+0.35, 4.3, 3.2, 1.7, body, size=12.5, color=MUT, line=1.3)
mono(s, 0.7, 6.55, 11.9, 0.5, "Anchors recomputed live as sliders move — the scale intuition tracks the physics, not a static factoid.", size=12, color=MUT)

# ------------------------------------------------- 7 · OUTPUT & WORKFLOW
s = add_slide()
kicker(s, 0.7, 0.6, "OUTPUT & WORKFLOW", "06")
title(s, 0.7, 1.0, 11.9, "Built to be used, not just watched", size=31)
rule(s, 0.7, 1.85, 2.2)
feats = [
    ("EXPORT PNG+JSON+WEBM", "Publication-grade 2× scene capture with an annotated parameter band, a complete reproducible JSON lab state (solver, parameters, all 16 observables), and a 6-second 8 Mbps animation of the accretion flow."),
    ("SHARE VIEW", "Every slider change is mirrored into the URL (?M=&a=&r=&i=). The JSON export embeds its own reproduction link — any result is one click from being re-derived."),
    ("2D GEODESIC PLOTS", "Light deflection α(b), ergosphere cross-section, photon trajectories — RK4-integrated and plotted beside the 3D view for teaching and cross-checking."),
]
y = 2.35
for h, b in feats:
    txt(s, 0.7, y, 4.0, 0.4, h, size=13.5, color=ACC, bold=True, font="Consolas")
    txt(s, 4.9, y, 7.7, 1.3, b, size=13, color=MUT, line=1.28)
    y += 1.45
rule(s, 0.7, 6.45, 11.93, color=RGBColor(0x3A,0x3F,0x4A), weight=0.75)
txt(s, 0.7, 6.68, 11.9, 0.6, "Reports render as a copy-ready analysis table — inputs, solver metadata and every observable with its exact source formula. Every claim in this deck is reproducible from the live app in one click.",
    size=12, color=MUT, line=1.25)

# ---------------------------------------------------------- 8 · CLOSING
s = add_slide()
kicker(s, 0.7, 0.85, "TRY IT NOW")
txt(s, 0.7, 1.7, 11.9, 1.6, [("See the universe ", {"color": INK}),
                              ("compute itself.", {"color": ACC})], size=44, bold=True, line=1.05)
txt(s, 0.7, 3.3, 11.9, 0.8, "BLACK HOLE LAB · Kerr general relativity, live in your browser", size=17, color=MUT)
rule(s, 0.7, 4.15, 2.2)
mono(s, 0.7, 4.5, 11.9, 1.4, [
    ("https://mertkrcnr-black-hole-lab.mertkrcnr.workers.dev", {"size": 20, "color": INK, "bold": True}),
], size=20)
mono(s, 0.7, 5.5, 11.9, 1.2, [
    ("Validated against M87* (EHT 2019), Sagittarius A* (EHT 2022) and the S2 stellar precession (VLT/GRAVITY 2020).\n", {}),
    ("Open source · runs entirely client-side · no accounts, no installs.", {"color": MUT}),
], size=12.5)

prs.save(OUT)
print("SAVED", OUT, os.path.getsize(OUT), "bytes,", len(prs.slides._sldIdLst), "slides")
