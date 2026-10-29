import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { removeDocumentFile } from "@/lib/document-storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession();
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        Client: { select: { id: true, name: true } },
        Project: { select: { id: true, name: true } },
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Transform to lowercase field names
    const transformedDocument = {
      ...document,
      client: document.Client,
      project: document.Project,
    };

    return NextResponse.json(transformedDocument);
  } catch (error) {
    console.error("GET /api/documents/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession();
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};

    if (body.type !== undefined) updateData.type = body.type;
    if (body.docNumber !== undefined) updateData.docNumber = body.docNumber;
    if (body.issueDate !== undefined) updateData.issueDate = new Date(body.issueDate);
    if (body.amount !== undefined) updateData.amount = body.amount;
    if (body.status !== undefined) updateData.status = body.status;
    // filePath는 업로드 API(/api/documents/upload)만 설정한다. 임의 경로 주입 방지.
    if (body.memo !== undefined) updateData.memo = body.memo;

    const document = await prisma.document.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error("PATCH /api/documents/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession();
  if (auth.response) return auth.response;

  try {
    const { id } = await params;

    // Get document to check for file
    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Delete document from database first, so a storage failure never leaves
    // a record pointing at a missing file
    await prisma.document.delete({
      where: { id },
    });

    // Delete associated file from Supabase Storage
    try {
      await removeDocumentFile(document.filePath);
    } catch (fileError) {
      console.error("Storage file deletion failed:", document.filePath, fileError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/documents/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}

