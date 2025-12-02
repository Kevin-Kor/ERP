import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const where: Record<string, unknown> = {};
    if (type && type !== "all") {
      where.type = type;
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        Client: { select: { name: true } },
        Project: { select: { name: true } },
      },
      orderBy: { issueDate: "desc" },
    });

    // Transform to lowercase field names
    const transformedDocuments = documents.map(d => ({
      ...d,
      client: d.Client,
      project: d.Project,
    }));

    return NextResponse.json({ documents: transformedDocuments });
  } catch (error) {
    console.error("GET /api/documents error:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Generate document number if not provided
    let docNumber = body.docNumber;
    if (!docNumber) {
      const now = new Date();
      const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
      const prefix = {
        QUOTE: "EST",
        TAX_INVOICE: "TAX",
        CONTRACT: "CON",
        OTHER: "DOC",
      }[body.type as string] || "DOC";

      const count = await prisma.document.count({
        where: {
          type: body.type,
          docNumber: { startsWith: `${prefix}-${yearMonth}` },
        },
      });

      docNumber = `${prefix}-${yearMonth}-${String(count + 1).padStart(3, "0")}`;
    }

    const document = await prisma.document.create({
      data: {
        ...body,
        docNumber,
        issueDate: new Date(body.issueDate),
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("POST /api/documents error:", error);
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    );
  }
}


