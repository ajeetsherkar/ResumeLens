export type BatchOverride = {
  candidate_id: string;
  field: string;
  original: unknown;
  corrected: unknown;
  reason: string;
  verified_by: string;
  date: string;
};

export type EducationRecord = {
  qualification: string | null;
  academic_level: string;
  field_of_study: string | null;
  institution: string | null;
  original_text: string;
  [key: string]: unknown;
};

export type AppliedOverride = BatchOverride;

export function applyCandidateOverrides(
  candidateId: string,
  education: EducationRecord[],
  overrides: BatchOverride[],
): {
  education: EducationRecord[];
  originalEducation: EducationRecord[];
  appliedOverrides: AppliedOverride[];
} {
  const originalEducation = structuredClone(education);
  const correctedEducation = structuredClone(education);
  const appliedOverrides: AppliedOverride[] = [];
  const usedFields = new Set<string>();

  for (const override of overrides) {
    if (override.candidate_id !== candidateId) continue;

    if (!/^education\[\d+\]\.institution$/.test(override.field)) {
      throw new Error(`Unsupported override field: ${override.field}`);
    }

    if (usedFields.has(override.field)) {
      throw new Error(`Duplicate override field: ${override.field}`);
    }
    usedFields.add(override.field);

    const match = /^education\[(\d+)\]\.institution$/.exec(override.field);
    const index = Number(match?.[1]);

    if (!Number.isInteger(index) || !correctedEducation[index]) {
      throw new Error(`Override references a missing education record: ${override.field}`);
    }

    if (typeof override.reason !== "string" || !override.reason.trim()) {
      throw new Error("Override reason is required.");
    }

    if (typeof override.verified_by !== "string" || !override.verified_by.trim()) {
      throw new Error("Override verifier is required.");
    }

    if (
      typeof override.date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(override.date) ||
      Number.isNaN(Date.parse(`${override.date}T00:00:00Z`))
    ) {
      throw new Error("Override date must use YYYY-MM-DD.");
    }

    const currentValue = correctedEducation[index].institution;

    if (JSON.stringify(currentValue) !== JSON.stringify(override.original)) {
      throw new Error(
        `Original value mismatch for ${override.candidate_id} ${override.field}.`,
      );
    }

    if (typeof override.corrected !== "string" || !override.corrected.trim()) {
      throw new Error("Corrected institution must be a non-empty string.");
    }

    correctedEducation[index].institution = override.corrected;
    appliedOverrides.push(structuredClone(override));
  }

  return {
    education: correctedEducation,
    originalEducation,
    appliedOverrides,
  };
}

export function validateOverrideCandidates(
  candidateIds: string[],
  overrides: BatchOverride[],
): void {
  const knownIds = new Set(candidateIds);

  for (const override of overrides) {
    if (!knownIds.has(override.candidate_id)) {
      throw new Error(
        `Override references unknown candidate: ${override.candidate_id}.`,
      );
    }
  }
}
