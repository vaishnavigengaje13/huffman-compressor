import os

base_dir = r"C:\Users\Vaishnavi Gengaje\.gemini\antigravity\scratch\huffman-compressor"
html_path = os.path.join(base_dir, "index.html")
css_path = os.path.join(base_dir, "css", "styles.css")
js_path = os.path.join(base_dir, "js", "app.js")

with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

with open(css_path, "r", encoding="utf-8") as f:
    css = f.read()

with open(js_path, "r", encoding="utf-8") as f:
    js = f.read()

# Replace any stylesheet reference with embedded style
for target in ['<link rel="stylesheet" href="styles.css">', '<link rel="stylesheet" href="css/styles.css">']:
    if target in html:
        html = html.replace(target, f"<style>\n{css}\n</style>")

# Replace any script reference with embedded script
for target in ['<script src="app.js"></script>', '<script src="js/app.js"></script>']:
    if target in html:
        html = html.replace(target, f"<script>\n{js}\n</script>")

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html)

print(f"Self-contained index.html generated successfully! File size: {len(html)} bytes")
