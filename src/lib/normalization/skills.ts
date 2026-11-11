import type { ResumeSectionName, SectionExtraction } from "./sections";

export interface NormalizedSkill {
  canonical_name: string;
  original_text: string;
  section: ResumeSectionName;
  start_offset: number;
  end_offset: number;
}

interface SkillDefinition {
  canonical_name: string;
  aliases: string[];
}

const SKILL_DICTIONARY: SkillDefinition[] = [
  // Life-cycle assessment and sustainability
  {
    canonical_name: "Life Cycle Assessment (LCA)",
    aliases: ["life cycle assessment", "life-cycle assessment", "LCA"],
  },
  {
    canonical_name: "Life Cycle Inventory (LCI)",
    aliases: ["life cycle inventory", "life-cycle inventory", "LCI"],
  },
  {
    canonical_name: "SimaPro",
    aliases: ["SimaPro", "Sima Pro"],
  },
  {
    canonical_name: "GaBi",
    aliases: ["GaBi", "GaBi software"],
  },
  {
    canonical_name: "openLCA",
    aliases: ["openLCA", "open LCA"],
  },
  {
    canonical_name: "Environmental Product Declaration (EPD)",
    aliases: ["Environmental Product Declaration", "EPD"],
  },
  {
    canonical_name: "ISO 14040",
    aliases: ["ISO 14040"],
  },
  {
    canonical_name: "ISO 14044",
    aliases: ["ISO 14044"],
  },
  {
    canonical_name: "Material Flow Cost Accounting (MFCA)",
    aliases: ["Material Flow Cost Accounting", "MFCA"],
  },

  // UI/UX and design
  {
    canonical_name: "Figma",
    aliases: ["Figma", "Figma Design"],
  },
  {
    canonical_name: "FigJam",
    aliases: ["FigJam", "Fig Jam"],
  },
  {
    canonical_name: "Miro",
    aliases: ["Miro"],
  },
  {
    canonical_name: "Prototyping",
    aliases: ["prototyping", "prototype design"],
  },
  {
    canonical_name: "Wireframing",
    aliases: ["wireframing", "wireframes", "wireframe design"],
  },
  {
    canonical_name: "User Research",
    aliases: ["user research", "UX research"],
  },
  {
    canonical_name: "Usability Testing",
    aliases: ["usability testing", "user testing"],
  },
  {
    canonical_name: "User-Centered Design",
    aliases: ["user-centered design", "user centred design"],
  },
  {
    canonical_name: "High-Fidelity Design",
    aliases: ["high-fidelity design", "high fidelity design"],
  },

  // Programming and data
  {
    canonical_name: "Python",
    aliases: ["Python"],
  },
  {
    canonical_name: "Java",
    aliases: ["Java"],
  },
  {
    canonical_name: "C++",
    aliases: ["C++"],
  },
  {
    canonical_name: "SQL",
    aliases: ["SQL"],
  },
  {
    canonical_name: "Microsoft Excel",
    aliases: ["Microsoft Excel", "MS Excel", "Excel"],
  },
  {
    canonical_name: "Power BI",
    aliases: ["Power BI", "PowerBI"],
  },
  {
    canonical_name: "Tableau",
    aliases: ["Tableau"],
  },
  {
    canonical_name: "NumPy",
    aliases: ["NumPy", "Numpy"],
  },
  {
    canonical_name: "Pandas",
    aliases: ["Pandas"],
  },
  {
    canonical_name: "Scikit-learn",
    aliases: ["Scikit-learn", "scikit learn", "sklearn"],
  },
  {
    canonical_name: "TensorFlow",
    aliases: ["TensorFlow", "Tensor Flow"],
  },
  {
    canonical_name: "PyTorch",
    aliases: ["PyTorch", "Py Torch"],
  },
];

const SECTION_ORDER: ResumeSectionName[] = [
  "skills",
  "experience",
  "projects",
  "education",
  "certifications",
  "summary",
];

interface SkillAlias {
  canonical_name: string;
  alias: string;
}

const SKILL_ALIASES: SkillAlias[] = SKILL_DICTIONARY
  .flatMap(skill =>
    skill.aliases.map(alias => ({
      canonical_name: skill.canonical_name,
      alias,
    })),
  )
  .sort((a, b) => b.alias.length - a.alias.length);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createAliasPattern(alias: string): RegExp {
  return new RegExp(
    `(^|[^\\p{L}\\p{N}])(${escapeRegExp(alias)})(?=$|[^\\p{L}\\p{N}])`,
    "giu",
  );
}

export function normalizeSkills(
  extraction: SectionExtraction,
): NormalizedSkill[] {
  const matches: NormalizedSkill[] = [];

  for (const section of SECTION_ORDER) {
    for (const line of extraction.sections[section]) {
      const candidates: NormalizedSkill[] = [];

      for (const skillAlias of SKILL_ALIASES) {
        const pattern = createAliasPattern(skillAlias.alias);
        let match: RegExpExecArray | null;

        while ((match = pattern.exec(line.text)) !== null) {
          const originalText = match[2];
          const localStart = match.index + match[1].length;
          const startOffset = line.start_offset + localStart;
          const endOffset = startOffset + originalText.length;

          candidates.push({
            canonical_name: skillAlias.canonical_name,
            original_text: originalText,
            section,
            start_offset: startOffset,
            end_offset: endOffset,
          });
        }
      }

      candidates.sort(
        (a, b) =>
          a.start_offset - b.start_offset ||
          b.original_text.length - a.original_text.length,
      );

      const lineMatches: NormalizedSkill[] = [];

      for (const candidate of candidates) {
        const overlaps = lineMatches.some(existing =>
          candidate.start_offset < existing.end_offset &&
          candidate.end_offset > existing.start_offset,
        );

        if (!overlaps) {
          lineMatches.push(candidate);
        }
      }

      matches.push(...lineMatches);
    }
  }

  return matches.sort(
    (a, b) =>
      a.start_offset - b.start_offset ||
      a.end_offset - b.end_offset,
  );
}
