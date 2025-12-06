import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - 클라이언트 관리 기록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;

    const [visits, payments, videos, memo] = await Promise.all([
      prisma.clientVisit.findMany({
        where: { clientId },
        orderBy: { date: "desc" },
      }),
      prisma.clientPayment.findMany({
        where: { clientId },
        orderBy: { month: "desc" },
      }),
      prisma.clientVideo.findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.clientMemo.findFirst({
        where: { clientId },
      }),
    ]);

    return NextResponse.json({
      visits: visits.map((v) => ({
        id: v.id,
        date: v.date.toISOString().split("T")[0],
        memo: v.memo || "",
      })),
      payments: payments.map((p) => ({
        month: p.month,
        deposit: p.deposit,
        balance: p.balance,
        memo: p.memo || "",
      })),
      videos: videos.map((v) => ({
        id: v.id,
        title: v.title,
        completed: v.completed,
        completedDate: v.completedDate?.toISOString().split("T")[0] || null,
        memo: v.memo || "",
      })),
      generalMemo: memo?.content || "",
    });
  } catch (error) {
    console.error("Failed to fetch client management:", error);
    return NextResponse.json(
      { error: "Failed to fetch client management" },
      { status: 500 }
    );
  }
}

// POST - 방문 기록 추가
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const body = await request.json();
    const { type, ...data } = body;

    if (type === "visit") {
      const visit = await prisma.clientVisit.create({
        data: {
          clientId,
          date: new Date(data.date),
          memo: data.memo || null,
        },
      });
      return NextResponse.json({
        id: visit.id,
        date: visit.date.toISOString().split("T")[0],
        memo: visit.memo || "",
      });
    }

    if (type === "payment") {
      const payment = await prisma.clientPayment.create({
        data: {
          clientId,
          month: data.month,
          deposit: false,
          balance: false,
          memo: "",
        },
      });
      return NextResponse.json({
        month: payment.month,
        deposit: payment.deposit,
        balance: payment.balance,
        memo: payment.memo || "",
      });
    }

    if (type === "video") {
      const video = await prisma.clientVideo.create({
        data: {
          clientId,
          title: data.title,
          completed: false,
          completedDate: null,
          memo: data.memo || null,
        },
      });
      return NextResponse.json({
        id: video.id,
        title: video.title,
        completed: video.completed,
        completedDate: null,
        memo: video.memo || "",
      });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Failed to create record:", error);
    return NextResponse.json(
      { error: "Failed to create record" },
      { status: 500 }
    );
  }
}

// PATCH - 기록 업데이트
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const body = await request.json();
    const { type, ...data } = body;

    if (type === "payment") {
      const payment = await prisma.clientPayment.update({
        where: {
          clientId_month: {
            clientId,
            month: data.month,
          },
        },
        data: {
          deposit: data.deposit,
          balance: data.balance,
          memo: data.memo,
        },
      });
      return NextResponse.json({
        month: payment.month,
        deposit: payment.deposit,
        balance: payment.balance,
        memo: payment.memo || "",
      });
    }

    if (type === "video") {
      const video = await prisma.clientVideo.update({
        where: { id: data.id },
        data: {
          completed: data.completed,
          completedDate: data.completed ? new Date() : null,
        },
      });
      return NextResponse.json({
        id: video.id,
        title: video.title,
        completed: video.completed,
        completedDate: video.completedDate?.toISOString().split("T")[0] || null,
        memo: video.memo || "",
      });
    }

    if (type === "memo") {
      const memo = await prisma.clientMemo.upsert({
        where: { clientId },
        update: { content: data.content },
        create: {
          clientId,
          content: data.content,
        },
      });
      return NextResponse.json({ generalMemo: memo.content });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update record:", error);
    return NextResponse.json(
      { error: "Failed to update record" },
      { status: 500 }
    );
  }
}

// DELETE - 기록 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const recordId = searchParams.get("recordId");
    const month = searchParams.get("month");

    if (type === "visit" && recordId) {
      await prisma.clientVisit.delete({
        where: { id: recordId },
      });
      return NextResponse.json({ success: true });
    }

    if (type === "payment" && month) {
      await prisma.clientPayment.delete({
        where: {
          clientId_month: {
            clientId,
            month,
          },
        },
      });
      return NextResponse.json({ success: true });
    }

    if (type === "video" && recordId) {
      await prisma.clientVideo.delete({
        where: { id: recordId },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  } catch (error) {
    console.error("Failed to delete record:", error);
    return NextResponse.json(
      { error: "Failed to delete record" },
      { status: 500 }
    );
  }
}
