import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
version = json.loads((root / "module.json").read_text())["version"]
release = root / "release"
release.mkdir(exist_ok=True)
with ZipFile(release / f"kaiju-vinculo-{version}.zip", "w", ZIP_DEFLATED) as archive:
    for path in sorted((root / "dist").rglob("*")):
        if path.is_file():
            archive.write(path, Path("kaiju-vinculo") / path.relative_to(root / "dist"))
with ZipFile(release / f"Modulo_Kaiju_{version}_Fonte_e_Instalacao.zip", "w", ZIP_DEFLATED) as archive:
    for path in sorted(root.rglob("*")):
        relative = path.relative_to(root)
        if any(part in {"node_modules", ".git", "release", "preview-dist", "reference-preview"} for part in relative.parts):
            continue
        if path.is_file():
            archive.write(path, Path("kaiju-next") / relative)
    archive.write(release / f"kaiju-vinculo-{version}.zip", f"instalar/kaiju-vinculo-{version}.zip")
print("Pacotes criados em release/.")
