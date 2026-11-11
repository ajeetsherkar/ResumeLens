#!/usr/bin/env python3
"""Select a reproducible blind evaluation sample from source DOCX filenames.

Sampling frame: 45 readable source resumes.
Excluded: resume_037.docx, confirmed empty in the Session 4 audit.
The script reads filenames only; it never reads resume contents or model output.
"""

import csv
import random
from pathlib import Path

SEED = 20261111
SAMPLE_SIZE = 15
CALIBRATION_SIZE = 8
EXCLUDED_IDS = {"resume_037"}

SOURCE_DIR = Path("public/resumes")
EVAL_DIR = Path("eval")
MANIFEST_PATH = EVAL_DIR / "sample-manifest.csv"
LABELS_PATH = EVAL_DIR / "labels.csv"


def main():
    if MANIFEST_PATH.exists() or LABELS_PATH.exists():
        raise SystemExit(
            "Refusing to overwrite existing evaluation files. "
            "Inspect eval/ before rerunning."
        )

    if not SOURCE_DIR.is_dir():
        raise SystemExit(f"Source directory not found: {SOURCE_DIR}")

    files = sorted(SOURCE_DIR.glob("resume_*.docx"))
    ids = [path.stem for path in files]

    if len(ids) != 46:
        raise SystemExit(f"Expected 46 source files, found {len(ids)}")

    expected = {f"resume_{number:03d}" for number in range(1, 47)}
    if set(ids) != expected:
        raise SystemExit("Source filenames do not match resume_001 to resume_046.")

    eligible = [candidate_id for candidate_id in ids
                if candidate_id not in EXCLUDED_IDS]

    if len(eligible) != 45:
        raise SystemExit(f"Expected 45 eligible resumes, found {len(eligible)}")

    rng = random.Random(SEED)
    selected = rng.sample(eligible, SAMPLE_SIZE)

    rows = []
    for index, candidate_id in enumerate(selected):
        split = "calibration" if index < CALIBRATION_SIZE else "held-out"
        rows.append({
            "candidate_id": candidate_id,
            "split": split,
            "selection_seed": SEED,
            "sampling_frame_size": len(eligible),
        })

    EVAL_DIR.mkdir(exist_ok=True)

    with MANIFEST_PATH.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(
            file,
            fieldnames=[
                "candidate_id",
                "split",
                "selection_seed",
                "sampling_frame_size",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

    with LABELS_PATH.open("w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow([
            "candidate_id",
            "split",
            "human_label",
            "rationale",
            "source_notes",
        ])

    print(f"Seed: {SEED}")
    print(f"Sampling frame: {len(eligible)} readable resumes")
    print("Excluded: resume_037 (confirmed empty in Session 4 audit)")
    print(f"Selected: {len(rows)}")
    print(f"Calibration: {CALIBRATION_SIZE}")
    print(f"Held-out: {SAMPLE_SIZE - CALIBRATION_SIZE}")
    print("\nSelected candidates (random selection order):")

    for row in rows:
        print(f"{row['candidate_id']}: {row['split']}")

    print(f"\nCreated: {MANIFEST_PATH}")
    print(f"Created: {LABELS_PATH}")


if __name__ == "__main__":
    main()
