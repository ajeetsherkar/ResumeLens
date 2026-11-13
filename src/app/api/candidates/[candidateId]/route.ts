import { getCandidateDetail } from "@/lib/data/candidate-detail";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ candidateId: string }> },
) {
  const { candidateId } = await params;
  const detail = getCandidateDetail(candidateId);

  if (!detail) {
    return Response.json(
      { error: "Candidate not found" },
      {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  return Response.json(detail, {
    headers: { "Cache-Control": "no-store" },
  });
}
