import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    // 병렬로 모든 쿼리 실행
    const [
      revenueResult,
      expenseResult,
      unpaidTransactions,
      pendingSettlements,
      completedProjectsWithoutInvoice,
      activeProjects,
      recentActivities,
      recentDocuments,
    ] = await Promise.all([
      // 이번 달 매출
      prisma.transaction.aggregate({
        where: {
          type: "REVENUE",
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        _sum: {
          amount: true,
        },
      }),

      // 이번 달 비용
      prisma.transaction.aggregate({
        where: {
          type: "EXPENSE",
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        _sum: {
          amount: true,
        },
      }),

      // 미수금 (필요한 필드만 선택)
      prisma.transaction.findMany({
        where: {
          type: "REVENUE",
          paymentStatus: "PENDING",
        },
        select: {
          id: true,
          date: true,
          amount: true,
          category: true,
          memo: true,
          Client: {
            select: {
              id: true,
              name: true,
            },
          },
          Project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          date: "asc",
        },
      }),

      // 인플루언서 미정산 (필요한 필드만 선택)
      prisma.projectInfluencer.findMany({
        where: {
          paymentStatus: {
            in: ["PENDING", "REQUESTED"],
          },
        },
        select: {
          id: true,
          fee: true,
          paymentDueDate: true,
          Influencer: {
            select: {
              name: true,
              instagramId: true,
            },
          },
          Project: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          paymentDueDate: "asc",
        },
      }),

      // 세금계산서 미발행 (필요한 필드만 선택)
      prisma.project.findMany({
        where: {
          status: "COMPLETED",
          Document: {
            none: {
              type: "TAX_INVOICE",
            },
          },
        },
        select: {
          id: true,
          name: true,
          Client: {
            select: {
              name: true,
            },
          },
        },
      }),

      // 진행 중 프로젝트 (필요한 필드만 선택)
      prisma.project.findMany({
        where: {
          status: "IN_PROGRESS",
        },
        select: {
          id: true,
          name: true,
          endDate: true,
          status: true,
          Client: {
            select: {
              name: true,
            },
          },
          User: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          endDate: "asc",
        },
      }),

      // 최근 활동 (필요한 필드만 선택)
      prisma.activity.findMany({
        take: 10,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          createdAt: true,
          User: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      // 최근 문서 (필요한 필드만 선택)
      prisma.document.findMany({
        take: 5,
        select: {
          id: true,
          type: true,
          docNumber: true,
          issueDate: true,
          amount: true,
          Client: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    const totalRevenue = revenueResult._sum.amount || 0;
    const totalExpense = expenseResult._sum.amount || 0;
    const netProfit = totalRevenue - totalExpense;
    const profitRate = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // 프로젝트 필터링 (메모리에서)
    const projectsEndingToday = activeProjects.filter((p) => {
      const endDate = new Date(p.endDate);
      endDate.setHours(0, 0, 0, 0);
      return endDate.getTime() === today.getTime();
    });

    const projectsEndingThisWeek = activeProjects.filter((p) => {
      const endDate = new Date(p.endDate);
      return endDate > today && endDate <= endOfWeek;
    });

    // Transform data to use lowercase field names for frontend
    const transformedUnpaidTransactions = unpaidTransactions.map(t => ({
      ...t,
      client: t.Client,
      project: t.Project,
    }));

    const transformedPendingSettlements = pendingSettlements.map(s => ({
      ...s,
      influencer: s.Influencer,
      project: s.Project,
    }));

    const transformedCompletedProjects = completedProjectsWithoutInvoice.map(p => ({
      ...p,
      client: p.Client,
    }));

    const transformedActiveProjects = activeProjects.map(p => ({
      ...p,
      client: p.Client,
      manager: p.User,
    }));

    const transformedActivities = recentActivities.map(a => ({
      ...a,
      user: a.User,
    }));

    const transformedDocuments = recentDocuments.map(d => ({
      ...d,
      client: d.Client,
    }));

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalExpense,
        netProfit,
        profitRate,
      },
      actions: {
        unpaidCount: transformedUnpaidTransactions.length,
        unpaidAmount: transformedUnpaidTransactions.reduce((sum, t) => sum + t.amount, 0),
        unpaidTransactions: transformedUnpaidTransactions,
        pendingSettlementsCount: transformedPendingSettlements.length,
        pendingSettlementsAmount: transformedPendingSettlements.reduce(
          (sum, s) => sum + s.fee,
          0
        ),
        pendingSettlements: transformedPendingSettlements,
        unissuedInvoicesCount: transformedCompletedProjects.length,
        unissuedInvoices: transformedCompletedProjects,
      },
      projects: {
        activeCount: transformedActiveProjects.length,
        endingTodayCount: projectsEndingToday.length,
        endingThisWeekCount: projectsEndingThisWeek.length,
        activeProjects: transformedActiveProjects.slice(0, 5),
      },
      recentActivities: transformedActivities,
      recentDocuments: transformedDocuments,
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}


