import type { SectionLine } from "./sections";

export type AcademicLevel =
  | "school"
  | "undergraduate"
  | "postgraduate"
  | "diploma"
  | "unknown";

export interface EducationItem {
  qualification: string | null;
  academic_level: AcademicLevel;
  field_of_study: string | null;
  institution: string | null;
  original_text: string;
  start_offset: number;
  end_offset: number;
  line_type: "qualification" | "institution" | "other";
}

interface QualificationDefinition {
  canonical_name: string;
  academic_level: AcademicLevel;
  aliases: string[];
}

const QUALIFICATIONS: QualificationDefinition[] = [
  {
    canonical_name: "Bachelor of Technology",
    academic_level: "undergraduate",
    aliases: ["B.Tech", "B Tech", "Bachelor of Technology"],
  },
  {
    canonical_name: "Bachelor of Engineering",
    academic_level: "undergraduate",
    aliases: ["B.E.", "B.E", "Bachelor of Engineering"],
  },
  {
    canonical_name: "Bachelor of Science",
    academic_level: "undergraduate",
    aliases: ["B.Sc.", "BSc", "Bachelor of Science"],
  },
  {
    canonical_name: "Bachelor of Design",
    academic_level: "undergraduate",
    aliases: ["B.Des.", "BDes", "Bachelor of Design"],
  },
  {
    canonical_name: "Bachelor of Computer Applications",
    academic_level: "undergraduate",
    aliases: ["BCA", "Bachelor of Computer Applications"],
  },
  {
    canonical_name: "Master of Technology",
    academic_level: "postgraduate",
    aliases: ["M.Tech", "M Tech", "Master of Technology"],
  },
  {
    canonical_name: "Master of Engineering",
    academic_level: "postgraduate",
    aliases: ["M.E.", "M.E", "Master of Engineering"],
  },
  {
    canonical_name: "Master of Science",
    academic_level: "postgraduate",
    aliases: ["M.Sc.", "MSc", "Master of Science"],
  },
  {
    canonical_name: "Master of Business Administration",
    academic_level: "postgraduate",
    aliases: ["MBA", "Master of Business Administration"],
  },
  {
    canonical_name: "Master of Computer Applications",
    academic_level: "postgraduate",
    aliases: ["MCA", "Master of Computer Applications"],
  },
];

const SCHOOL_PATTERNS = [
  /\bHSC\b/i,
  /\bSSC\b/i,
  /\b12th\b/i,
  /\b10th\b/i,
  /\bHigher Secondary\b/i,
  /\bSecondary School\b/i,
];

const DIPLOMA_PATTERN = /\bDiploma\b/i;

const INSTITUTION_PATTERN =
  /\b(university|college|institute|school)\b/i;

const FIELD_PATTERNS: Array<{
  canonical_name: string;
  pattern: RegExp;
}> = [
  {
    canonical_name: "Artificial Intelligence and Machine Learning",
    pattern: /\bArtificial Intelligence\s*(?:and|&)\s*Machine Learning\b|\bAIML\b/i,
  },
  {
    canonical_name: "Computer Science",
    pattern: /\bComputer Science\b/i,
  },
  {
    canonical_name: "Information Technology",
    pattern: /\bInformation Technology\b/i,
  },
  {
    canonical_name: "Mechanical Engineering",
    pattern: /\bMechanical Engineering\b/i,
  },
  {
    canonical_name: "Electronics Engineering",
    pattern: /\bElectronics(?: and Communication)? Engineering\b/i,
  },
  {
    canonical_name: "Electrical Engineering",
    pattern: /\bElectrical Engineering\b/i,
  },
  {
    canonical_name: "Civil Engineering",
    pattern: /\bCivil Engineering\b/i,
  },
  {
    canonical_name: "Design",
    pattern: /\b(?:UI\/UX|UX\/UI|Product Design|Graphic Design|Design)\b/i,
  },
  {
    canonical_name: "Management",
    pattern: /\bManagement\b/i,
  },
  {
    canonical_name: "Commerce",
    pattern: /\bCommerce\b/i,
  },
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findQualification(
  text: string,
): QualificationDefinition | null {
  const aliases = QUALIFICATIONS.flatMap(definition =>
    definition.aliases.map(alias => ({
      definition,
      alias,
    })),
  ).sort((a, b) => b.alias.length - a.alias.length);

  for (const item of aliases) {
    const pattern = new RegExp(
      `(^|[^\\p{L}\\p{N}])(${escapeRegExp(item.alias)})(?=$|[^\\p{L}\\p{N}])`,
      "iu",
    );

    if (pattern.test(text)) {
      return item.definition;
    }
  }

  return null;
}

function findFieldOfStudy(text: string): string | null {
  for (const field of FIELD_PATTERNS) {
    if (field.pattern.test(text)) {
      return field.canonical_name;
    }
  }

  return null;
}

function classifyLine(
  text: string,
): EducationItem["line_type"] {
  if (findQualification(text) || SCHOOL_PATTERNS.some(p => p.test(text)) ||
      DIPLOMA_PATTERN.test(text)) {
    return "qualification";
  }

  if (INSTITUTION_PATTERN.test(text)) {
    return "institution";
  }

  return "other";
}

export function extractEducation(
  lines: SectionLine[],
): EducationItem[] {
  return lines.map(line => {
    const qualification = findQualification(line.text);
    const isSchool = SCHOOL_PATTERNS.some(
      pattern => pattern.test(line.text),
    );
    const isDiploma = DIPLOMA_PATTERN.test(line.text);

    let academicLevel: AcademicLevel = "unknown";

    if (qualification) {
      academicLevel = qualification.academic_level;
    } else if (isSchool) {
      academicLevel = "school";
    } else if (isDiploma) {
      academicLevel = "diploma";
    }

    const lineType = classifyLine(line.text);

    return {
      qualification: qualification?.canonical_name ?? null,
      academic_level: academicLevel,
      field_of_study: findFieldOfStudy(line.text),
      institution: lineType === "institution" ? line.text : null,
      original_text: line.text,
      start_offset: line.start_offset,
      end_offset: line.end_offset,
      line_type: lineType,
    };
  });
}
