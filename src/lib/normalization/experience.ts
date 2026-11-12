export type ExperienceDatePrecision = "month" | "year";

export type ExperienceDateWarning =
  | "missing_date"
  | "invalid_date"
  | "ambiguous_date";

export interface ParsedExperienceDate {
  original_text: string;
  normalized_start: string | null;
  normalized_end: string | null;
  start_month_index: number | null;
  end_month_index: number | null;
  precision: ExperienceDatePrecision | null;
  is_current: boolean;
  warning: ExperienceDateWarning | null;
  stated_duration_months: number | null;
}

export interface ExperiencePeriod {
  original_start: string;
  original_end: string;
  start_month_index: number;
  end_month_index: number;
  attribution: "employment" | "internship" | "project" | "unknown";
}

export interface MergedExperiencePeriod {
  start_month_index: number;
  end_month_index: number;
  months_max: number;
}

export interface RoleExperienceInput {
  role_title: string;
  employer?: string;
  original_date_text: string;
  description: string;
  attribution?: ExperiencePeriod["attribution"];
}

export interface RoleExperienceResult {
  role_title: string;
  employer: string | null;
  dates: ParsedExperienceDate;
  lca_experience_months_max: number | null;
  attribution_text: string;
  confidence: number;
}

export interface ExperienceCalculationResult {
  roles: RoleExperienceResult[];
  merged_periods: MergedExperiencePeriod[];
  total_experience_months_max: number | null;
  lca_experience_months_max: number | null;
  month_counting_convention: "elapsed_months";
  warnings: string[];
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

const CURRENT_PATTERN = /^(present|current|ongoing|now)$/i;

function monthIndex(year: number, month: number): number {
  return year * 12 + month - 1;
}

function formatMonth(index: number): string {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;

  return `${year}-${String(month).padStart(2, "0")}`;
}

function normalizeYear(value: string): number | null {
  const cleaned = value.trim().replace(/[’‘]/g, "'");

  if (/^\d{2}$/.test(cleaned)) {
    return 2000 + Number(cleaned);
  }

  if (/^\d{4}$/.test(cleaned)) {
    const year = Number(cleaned);
    return year >= 1900 && year <= 2200 ? year : null;
  }

  return null;
}

function parseMonthYear(
  value: string,
): { year: number; month: number } | null {
  const match = value.trim().replace(/[’‘]/g, "'").match(
    /^([A-Za-z]+)\.?\s+['"]?(\d{2}|\d{4})$/,
  );

  if (!match) return null;

  const month = MONTHS[match[1].toLowerCase()];
  const year = normalizeYear(match[2]);

  if (!month || !year) return null;

  return { year, month };
}

function parseNumericMonthYear(
  value: string,
): { year: number; month: number } | null {
  const match = value.trim().match(/^(\d{1,2})\/(\d{4})$/);

  if (!match) return null;

  const month = Number(match[1]);
  const year = normalizeYear(match[2]);

  if (!year || month < 1 || month > 12) return null;

  return { year, month };
}

function parseYear(value: string): number | null {
  return normalizeYear(value);
}

function splitDateRange(value: string): string[] {
  return value.split(/\s*(?:–|—|-|\bto\b)\s*/i);
}

function emptyDate(
  originalText: string,
  warning: ExperienceDateWarning,
): ParsedExperienceDate {
  return {
    original_text: originalText,
    normalized_start: null,
    normalized_end: null,
    start_month_index: null,
    end_month_index: null,
    precision: null,
    is_current: false,
    warning,
    stated_duration_months: null,
  };
}

export function parseExperienceDateRange(
  originalText: string,
  referenceDate: string,
): ParsedExperienceDate {
  const original = originalText.trim();

  if (
    !original ||
    /^(null|none|not specified|dates not provided|not provided)$/i.test(original)
  ) {
    return emptyDate(originalText, "missing_date");
  }

  const durationMatch = original.match(
    /^(\d+(?:\.\d+)?)\s*(months?|mos?|years?|yrs?)$/i,
  );

  if (durationMatch) {
    const amount = Number(durationMatch[1]);
    const unit = durationMatch[2].toLowerCase();
    const months = unit.startsWith("y")
      ? amount * 12
      : amount;

    if (!Number.isFinite(months) || months <= 0) {
      return emptyDate(originalText, "invalid_date");
    }

    return {
      original_text: originalText,
      normalized_start: null,
      normalized_end: null,
      start_month_index: null,
      end_month_index: null,
      precision: null,
      is_current: false,
      warning: "ambiguous_date",
      stated_duration_months: Math.round(months),
    };
  }

  const reference = parseMonthYear(referenceDate);

  if (!reference) {
    throw new Error(
      "referenceDate must use a valid month and year, e.g. Nov 2026.",
    );
  }

  if (CURRENT_PATTERN.test(original)) {
    return emptyDate(originalText, "missing_date");
  }

  const parts = splitDateRange(original);

  if (parts.length !== 2) {
    return emptyDate(originalText, "invalid_date");
  }

  const [startText, endText] = parts.map(part => part.trim());

  const startMonth = parseMonthYear(startText) ?? parseNumericMonthYear(startText);
  const startYear = parseYear(startText);
  const endMonth = parseMonthYear(endText) ?? parseNumericMonthYear(endText);
  const endYear = parseYear(endText);
  const isCurrent = CURRENT_PATTERN.test(endText);

  let resolvedStart = startMonth;
  let resolvedEnd = endMonth;
  let precision: ExperienceDatePrecision;
  let warning: ExperienceDateWarning | null = null;

  // Example: Jun - Jul 2024
  const partialStart = startText.match(/^([A-Za-z]+)\.?$/);
  const partialEnd = endText.match(
    /^([A-Za-z]+)\.?\s+['"]?(\d{2}|\d{4})$/,
  );

  if (!startMonth && partialStart && partialEnd) {
    const startMonthNumber = MONTHS[partialStart[1].toLowerCase()];
    const endMonthNumber = MONTHS[partialEnd[1].toLowerCase()];
    const year = normalizeYear(partialEnd[2]);

    if (!startMonthNumber || !endMonthNumber || !year) {
      return emptyDate(originalText, "invalid_date");
    }

    resolvedStart = { year, month: startMonthNumber };
    resolvedEnd = { year, month: endMonthNumber };
    warning = "ambiguous_date";
  }

  if (!resolvedStart && startYear && endYear) {
    precision = "year";
  } else if (resolvedStart && resolvedEnd) {
    precision = "month";
  } else if (resolvedStart && isCurrent) {
    precision = "month";
  } else if (!resolvedStart && startYear && isCurrent) {
    precision = "year";
  } else {
    return emptyDate(
      originalText,
      startMonth && endYear ? "ambiguous_date" : "invalid_date",
    );
  }

  const startMonthIndex =
    precision === "year"
      ? monthIndex(startYear!, 1)
      : monthIndex(resolvedStart!.year, resolvedStart!.month);

  const endMonthIndex = isCurrent
    ? monthIndex(reference.year, reference.month)
    : precision === "year"
      ? monthIndex(endYear!, 12)
      : monthIndex(resolvedEnd!.year, resolvedEnd!.month);

  if (endMonthIndex <= startMonthIndex) {
    return emptyDate(originalText, "invalid_date");
  }

  return {
    original_text: originalText,
    normalized_start: formatMonth(startMonthIndex),
    normalized_end: formatMonth(endMonthIndex),
    start_month_index: startMonthIndex,
    end_month_index: endMonthIndex,
    precision,
    is_current: isCurrent,
    warning,
    stated_duration_months: null,
  };
}

export function mergeExperiencePeriods(
  periods: ExperiencePeriod[],
): MergedExperiencePeriod[] {
  const sorted = [...periods].sort(
    (a, b) =>
      a.start_month_index - b.start_month_index ||
      a.end_month_index - b.end_month_index,
  );

  const merged: MergedExperiencePeriod[] = [];

  for (const period of sorted) {
    if (period.end_month_index <= period.start_month_index) {
      continue;
    }

    const previous = merged[merged.length - 1];

    if (
      previous &&
      period.start_month_index <= previous.end_month_index
    ) {
      previous.end_month_index = Math.max(
        previous.end_month_index,
        period.end_month_index,
      );

      previous.months_max =
        previous.end_month_index - previous.start_month_index;
    } else {
      merged.push({
        start_month_index: period.start_month_index,
        end_month_index: period.end_month_index,
        months_max:
          period.end_month_index - period.start_month_index,
      });
    }
  }

  return merged;
}

function hasExplicitLcaEvidence(description: string): boolean {
  return /\b(?:life[- ]cycle assessment|life[- ]cycle analysis|life[- ]cycle inventory|cradle[- ]to[- ]grave LCA|LCA|LCI)\b/i.test(
    description,
  );
}

export function calculateRoleExperience(
  role: RoleExperienceInput,
  referenceDate: string,
): RoleExperienceResult {
  const dates = parseExperienceDateRange(
    role.original_date_text,
    referenceDate,
  );

  const explicitLca = hasExplicitLcaEvidence(role.description);

  const validDates =
    dates.start_month_index !== null &&
    dates.end_month_index !== null;

  const lcaMonths =
    explicitLca && validDates
      ? dates.end_month_index! - dates.start_month_index!
      : null;

  let attributionText: string;
  let confidence: number;

  if (!explicitLca) {
    attributionText =
      "No explicit role-level LCA evidence; LCA experience is unknown.";
    confidence = 0;
  } else if (!validDates) {
    attributionText =
      "Explicit role-level LCA evidence detected, but its duration cannot be calculated.";
    confidence = 0;
  } else {
    attributionText = "Explicit role-level LCA evidence detected.";
    confidence = dates.warning === "ambiguous_date"
      ? 0.6
      : dates.precision === "month" ? 0.9 : 0.7;
  }

  return {
    role_title: role.role_title,
    employer: role.employer ?? null,
    dates,
    lca_experience_months_max: lcaMonths,
    attribution_text: attributionText,
    confidence,
  };
}

export function calculateCandidateExperience(
  roles: RoleExperienceInput[],
  referenceDate: string,
): ExperienceCalculationResult {
  const results = roles.map(role =>
    calculateRoleExperience(role, referenceDate),
  );

  const validPeriods: ExperiencePeriod[] = [];
  const lcaPeriods: ExperiencePeriod[] = [];
  const warnings: string[] = [];

  results.forEach((result, index) => {
    const dates = result.dates;
    const role = roles[index];

    if (
      dates.start_month_index === null ||
      dates.end_month_index === null
    ) {
      warnings.push(
        `${role.role_title}: ${dates.warning ?? "invalid_date"}`,
      );
      return;
    }

    if (dates.warning) {
      warnings.push(`${role.role_title}: ${dates.warning}`);
    }

    const period: ExperiencePeriod = {
      original_start: dates.original_text,
      original_end: dates.normalized_end!,
      start_month_index: dates.start_month_index,
      end_month_index: dates.end_month_index,
      attribution: role.attribution ?? "unknown",
    };

    if (
      period.attribution === "employment" ||
      period.attribution === "internship"
    ) {
      validPeriods.push(period);
    }

    if (result.lca_experience_months_max !== null) {
      lcaPeriods.push(period);
    }
  });

  const mergedPeriods = mergeExperiencePeriods(validPeriods);
  const mergedLcaPeriods = mergeExperiencePeriods(lcaPeriods);

  const sumMonths = (periods: MergedExperiencePeriod[]) =>
    periods.reduce((sum, period) => sum + period.months_max, 0);

  return {
    roles: results,
    merged_periods: mergedPeriods,
    total_experience_months_max:
      mergedPeriods.length ? sumMonths(mergedPeriods) : null,
    lca_experience_months_max:
      mergedLcaPeriods.length ? sumMonths(mergedLcaPeriods) : null,
    month_counting_convention: "elapsed_months",
    warnings,
  };
}
