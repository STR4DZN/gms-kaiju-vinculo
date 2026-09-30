from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
release = root / "release"
release.mkdir(exist_ok=True)
with ZipFile(release / "kaiju-vinculo-0.1.0.zip", "w", ZIP_DEFLATED) as archive:
    for path in sorted((root / "dist").rglob("*")):
        if path.is_file():
            archive.write(path, Path("kaiju-vinculo") / path.relative_to(root / "dist"))
with ZipFile(release / "Modulo_Kaiju_0.1.0_Fonte_e_Instalacao.zip", "w", ZIP_DEFLATED) as archive:
    for path in sorted(root.rglob("*")):
        relative = path.relative_to(root)
        if any(part in {"node_modules", ".git", "release", "preview-dist", "reference-preview"} for part in relative.parts):
            continue
        if path.is_file():
            archive.write(path, Path("kaiju-next") / relative)
    archive.write(release / "kaiju-vinculo-0.1.0.zip", "instalar/kaiju-vinculo-0.1.0.zip")
print("Pacotes criados em release/.")
