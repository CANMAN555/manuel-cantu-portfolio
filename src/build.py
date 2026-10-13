"""Builds the site's HTML pages from the pieces in src/pages.

Run from the repo root:  python3 src/build.py
Each page gets the same head, menu and footer, so edit those here once.
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = ROOT / "src" / "pages"
SITE_URL = "https://canman555.github.io/manuel-cantu-portfolio/"

TABS = [
    ("index.html", "Home"),
    ("about.html", "About"),
    ("experience.html", "Experience"),
    ("projects.html", "Projects"),
    ("resume.html", "Resume"),
    ("contact.html", "Contact"),
]

HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{description}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:image" content="{site}assets/manny-portrait-600.jpg">
<meta name="theme-color" content="#f7f4ef">
<link rel="icon" type="image/png" href="assets/favicon.png">
<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">
<link rel="preload" href="assets/fonts/cormorant-500.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/jost-300-600.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="styles.css">
</head>
<body>

<a class="skip" href="#main">Skip to content</a>
"""

FOOT = """
<footer class="site-foot">
  <div class="wrap foot-grid">
    <div class="foot-brand">
      <img src="assets/mc-logo.png" alt="" width="308" height="242">
      <div>
        <p class="foot-name">Manuel Cantu</p>
        <p>Professional Coordinator · Papillion, NE</p>
      </div>
    </div>
    <nav class="foot-links" aria-label="Footer">
{foot_links}
    </nav>
    <div class="foot-contact">
      <a href="mailto:manuelcantu55@yahoo.com">manuelcantu55@yahoo.com</a>
      <a href="https://github.com/CANMAN555">github.com/CANMAN555</a>
    </div>
  </div>
  <p class="foot-copy">© 2026 Manuel Cantu</p>
</footer>
{scripts}
</body>
</html>
"""


def nav(active):
    current = ' aria-current="page"'
    links = "\n".join(
        f'      <a href="{href}"{current if href == active else ""}>{label}</a>'
        for href, label in TABS
    )
    return f"""
<header class="nav" id="nav">
  <div class="wrap nav-inner">
    <a class="brand" href="index.html" aria-label="Manuel Cantu, home"><img src="assets/mc-logo.png" alt="" width="308" height="242"><span>Manuel Cantu</span></a>
    <nav class="tabs" aria-label="Main">
{links}
    </nav>
  </div>
</header>
"""


def page_head(kicker, title, lede):
    return f"""<section class="page-head">
  <div class="wrap">
    <p class="kicker">{kicker}</p>
    <h1>{title}</h1>
    <p class="page-lede">{lede}</p>
  </div>
</section>
"""


def piece(name):
    return (PAGES / name).read_text()


def build(filename, title, description, body, scripts=""):
    foot_links = "\n".join(f'      <a href="{h}">{l}</a>' for h, l in TABS)
    html = (
        HEAD.format(title=title, description=description, site=SITE_URL)
        + nav(filename)
        + '\n<main id="main">\n\n'
        + body
        + "\n</main>\n"
        + FOOT.format(foot_links=foot_links, scripts=scripts)
    )
    (ROOT / filename).write_text(html)
    print("built", filename)


DESC = "Manuel Cantu, Professional Coordinator in fleet maintenance and operations."

build("index.html", "Manuel Cantu · Professional Coordinator",
      DESC + " Fleet repair coordinator, former service manager, factory-certified diesel technician, and project lead of the OpenRoad Service Map website.",
      piece("home.html"))
build("about.html", "About · Manuel Cantu", DESC + " Profile, mission, skills, education and certifications.",
      page_head("About", "About Me", "A coordinator with a wide range of skills, from leading people to building technology to hands-on mechanical work.")
      + piece("about.html"))
build("experience.html", "Experience · Manuel Cantu", DESC + " Work history in fleet coordination, service management and diesel repair.",
      page_head("Experience", "Where I've Worked", "From diesel mechanic to service manager to fleet repair coordinator.")
      + piece("experience.html"))
build("projects.html", "Projects · Manuel Cantu", DESC + " OpenRoad Service Map and AI training work.",
      page_head("Projects", "What I've Built", "Technology projects I planned, led and put to work.")
      + piece("projects.html"))
build("resume.html", "Resume · Manuel Cantu", DESC + " View or download the resume.",
      page_head("Resume", "My Resume", "Take a look below, or download the PDF to keep or print.")
      + piece("resume.html"))
build("contact.html", "Contact · Manuel Cantu", DESC + " Email and GitHub.",
      page_head("Contact", "Get in Touch", "Have a team, a project or an operation that needs someone to keep it organized? Send me a note.")
      + piece("contact.html"),
      scripts='<script src="contact.js" defer></script>')
