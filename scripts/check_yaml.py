"""Parse submission YAML without a cluster. This is not Kubernetes schema validation."""
from pathlib import Path
import yaml

root = Path(__file__).resolve().parents[1]
files = sorted(root.rglob("*.yaml")) + sorted(root.rglob("*.yml"))
files = [p for p in files if ".git" not in p.parts and "node_modules" not in p.parts]
for file in files:
    list(yaml.safe_load_all(file.read_text(encoding="utf-8")))
    print(f"Parsed {file.relative_to(root)}")
print(f"YAML syntax OK ({len(files)} files); no runtime/schema claim.")
