export interface EvidenceRange {
  id: string;
  start: number;
  end: number;
  text: string;
  criterionId: string;
  criterionLabel: string;
  role: "LCA" | "UI/UX";
  verified: boolean;
}

export interface HighlightSegment {
  start: number;
  end: number;
  text: string;
  evidenceIds: string[];
  criterionIds: string[];
  criterionLabels: string[];
  roles: Array<"LCA" | "UI/UX">;
}

export function buildHighlightSegments(
  sourceText: string,
  evidence: EvidenceRange[],
): HighlightSegment[] {
  const valid = evidence
    .filter(
      (item) =>
        item.verified &&
        Number.isInteger(item.start) &&
        Number.isInteger(item.end) &&
        item.start >= 0 &&
        item.end > item.start &&
        item.end <= sourceText.length &&
        sourceText.slice(item.start, item.end) === item.text,
    )
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const boundaries = [
    ...new Set(valid.flatMap((item) => [item.start, item.end])),
  ].sort((a, b) => a - b);

  const segments: HighlightSegment[] = [];

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const start = boundaries[index];
    const end = boundaries[index + 1];

    if (start === undefined || end === undefined || start === end) {
      continue;
    }

    const active = valid.filter(
      (item) => item.start < end && item.end > start,
    );

    if (active.length === 0) continue;

    const evidenceIds = [...new Set(active.map((item) => item.id))];
    const criterionIds = [
      ...new Set(active.map((item) => item.criterionId)),
    ];
    const criterionLabels = [
      ...new Set(active.map((item) => item.criterionLabel)),
    ];
    const roles = [...new Set(active.map((item) => item.role))];

    const previous = segments[segments.length - 1];

    if (
      previous &&
      previous.end === start &&
      previous.evidenceIds.join("|") === evidenceIds.join("|")
    ) {
      previous.end = end;
      previous.text = sourceText.slice(previous.start, end);
      continue;
    }

    segments.push({
      start,
      end,
      text: sourceText.slice(start, end),
      evidenceIds,
      criterionIds,
      criterionLabels,
      roles,
    });
  }

  return segments;
}
