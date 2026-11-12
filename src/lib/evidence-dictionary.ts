export type EvidenceRole = "LCA" | "UI/UX";

export interface EvidenceCriterion {
  criterion_id: string;
  label: string;
  aliases: string[];
}

export const EVIDENCE_DICTIONARY: Record<
  EvidenceRole,
  EvidenceCriterion[]
> = {
  LCA: [
    {
      criterion_id: "lca_methodology",
      label: "Life Cycle Assessment",
      aliases: [
        "life cycle assessment",
        "life-cycle assessment",
        "life cycle analysis",
        "life-cycle analysis",
        "LCA",
      ],
    },
    {
      criterion_id: "lci",
      label: "Life Cycle Inventory",
      aliases: [
        "life cycle inventory",
        "life-cycle inventory",
        "LCI",
      ],
    },
    {
      criterion_id: "lca_standards",
      label: "LCA Standards",
      aliases: [
        "ISO 14040",
        "ISO 14044",
        "ISO 14040/14044",
      ],
    },
    {
      criterion_id: "lca_software",
      label: "LCA Software",
      aliases: [
        "SimaPro",
        "Sima Pro",
        "GaBi",
        "GaBi software",
        "openLCA",
        "open LCA",
      ],
    },
    {
      criterion_id: "epd",
      label: "Environmental Product Declaration",
      aliases: [
        "Environmental Product Declaration",
        "EPD",
      ],
    },
    {
      criterion_id: "impact_assessment",
      label: "Environmental Impact Assessment",
      aliases: [
        "life cycle impact assessment",
        "life-cycle impact assessment",
        "LCIA",
        "impact assessment",
      ],
    },
    {
      criterion_id: "carbon_footprint",
      label: "Carbon Footprint",
      aliases: [
        "carbon footprint",
        "product carbon footprint",
        "PCF",
      ],
    },
    {
      criterion_id: "environmental_assessment",
      label: "Environmental Assessment",
      aliases: [
        "environmental assessment",
        "environmental performance",
        "environmental sustainability",
      ],
    },
  ],

  "UI/UX": [
    {
      criterion_id: "design_tools",
      label: "UI/UX Design Tools",
      aliases: [
        "Figma",
        "Figma Design",
        "FigJam",
        "Fig Jam",
        "Miro",
        "Adobe XD",
        "Sketch",
      ],
    },
    {
      criterion_id: "wireframing",
      label: "Wireframing",
      aliases: [
        "wireframing",
        "wireframe",
        "wireframes",
      ],
    },
    {
      criterion_id: "prototyping",
      label: "Prototyping",
      aliases: [
        "prototyping",
        "prototype design",
        "interactive prototype",
        "interactive prototyping",
      ],
    },
    {
      criterion_id: "interaction_design",
      label: "Interaction Design",
      aliases: [
        "interaction design",
        "interaction patterns",
        "microinteractions",
      ],
    },
    {
      criterion_id: "visual_design",
      label: "Visual Design",
      aliases: [
        "visual design",
        "visual hierarchy",
        "typography",
        "color theory",
      ],
    },
    {
      criterion_id: "user_research",
      label: "User Research",
      aliases: [
        "user research",
        "UX research",
        "user interviews",
        "user interview",
        "user surveys",
        "user survey",
        "contextual inquiry",
      ],
    },
    {
      criterion_id: "usability_testing",
      label: "Usability Testing",
      aliases: [
        "usability testing",
        "user testing",
        "usability study",
        "usability studies",
      ],
    },
    {
      criterion_id: "design_methods",
      label: "User-Centered Design Methods",
      aliases: [
        "user-centered design",
        "user centred design",
        "design thinking",
        "design sprint",
        "design sprints",
      ],
    },
    {
      criterion_id: "research_artifacts",
      label: "UX Research Artifacts",
      aliases: [
        "user personas",
        "personas",
        "user journey mapping",
        "journey mapping",
        "customer journey mapping",
        "user flows",
        "information architecture",
      ],
    },
    {
      criterion_id: "design_systems",
      label: "Design Systems",
      aliases: [
        "design system",
        "design systems",
        "component library",
        "component libraries",
        "high-fidelity design",
        "high fidelity design",
      ],
    },
  ],
};
