import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type StatusKey = "pending" | "in_progress" | "completed";

const normalizeStatus = (status?: string): StatusKey => {
    const value = (status || "").toLowerCase();
    if (value === "completed") return "completed";
    if (value === "in_progress" || value === "requested") return "in_progress";
    return "pending";
};

export async function GET() {
    try {
        const [statusGroups, influencerGroups, projectGroups] = await Promise.all([
            prisma.projectInfluencer.groupBy({
                by: ["paymentStatus"],
                _sum: { fee: true },
                _count: { _all: true },
            }),
            prisma.projectInfluencer.groupBy({
                by: ["influencerId"],
                _sum: { fee: true },
                _count: { _all: true },
            }),
            prisma.projectInfluencer.groupBy({
                by: ["projectId"],
                _sum: { fee: true },
                _count: { _all: true },
            }),
        ]);

        const statusTotals: Record<StatusKey, { amount: number; count: number }> = {
            pending: { amount: 0, count: 0 },
            in_progress: { amount: 0, count: 0 },
            completed: { amount: 0, count: 0 },
        };

        statusGroups.forEach((group) => {
            const key = normalizeStatus(group.paymentStatus) as StatusKey;
            statusTotals[key].amount += group._sum.fee || 0;
            statusTotals[key].count += group._count._all;
        });

        const influencerIds = influencerGroups.map((group) => group.influencerId);
        const influencers = influencerIds.length
            ? await prisma.influencer.findMany({
                  where: { id: { in: influencerIds } },
                  select: { id: true, name: true, instagramId: true },
              })
            : [];

        const influencerMap = new Map(influencers.map((influencer) => [influencer.id, influencer]));

        const influencerTotals = influencerGroups
            .map((group) => ({
                influencer: influencerMap.get(group.influencerId),
                totalFee: group._sum.fee || 0,
                projects: group._count._all,
            }))
            .filter((group) => group.influencer)
            .sort((a, b) => b.totalFee - a.totalFee);

        const projectIds = projectGroups.map((group) => group.projectId);
        const projects = projectIds.length
            ? await prisma.project.findMany({
                  where: { id: { in: projectIds } },
                  select: {
                      id: true,
                      name: true,
                      Client: { select: { id: true, name: true } },
                  },
              })
            : [];

        const projectMap = new Map(projects.map((project) => [project.id, project]));

        const projectTotals = projectGroups
            .map((group) => ({
                project: projectMap.get(group.projectId),
                totalFee: group._sum.fee || 0,
                influencers: group._count._all,
            }))
            .filter((group) => group.project)
            .sort((a, b) => b.totalFee - a.totalFee);

        return NextResponse.json({
            statusTotals,
            influencerTotals,
            projectTotals,
        });
    } catch (error) {
        console.error("GET /api/settlements/summary error:", error);
        return NextResponse.json({ error: "Failed to load settlement summary" }, { status: 500 });
    }
}
