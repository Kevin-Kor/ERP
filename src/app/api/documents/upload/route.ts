import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import {
  ALLOWED_DOCUMENT_TYPES,
  buildStoragePath,
  getFileExtension,
  removeDocumentFile,
  uploadDocumentFile,
} from "@/lib/document-storage";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if (auth.response) return auth.response;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const documentId = formData.get("documentId");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (typeof documentId !== "string" || !documentId) {
      return NextResponse.json({ error: "No document ID provided" }, { status: 400 });
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "파일 크기가 50MB를 초과합니다." },
        { status: 400 }
      );
    }

    // 확장자 화이트리스트는 항상 적용하고, Content-Type도 확장자 기준으로 정한다
    const extension = getFileExtension(file.name);
    if (!extension || !ALLOWED_DOCUMENT_TYPES[extension]) {
      return NextResponse.json(
        { error: "지원하지 않는 파일 형식입니다." },
        { status: 400 }
      );
    }

    // Verify document exists
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const storagePath = buildStoragePath(document.docNumber, extension);
    const buffer = Buffer.from(await file.arrayBuffer());

    try {
      await uploadDocumentFile(storagePath, buffer, ALLOWED_DOCUMENT_TYPES[extension]);
    } catch (error) {
      console.error("Supabase storage error:", error);
      return NextResponse.json(
        { error: "파일 업로드에 실패했습니다." },
        { status: 500 }
      );
    }

    // 공개 URL 대신 버킷 내부 경로를 저장한다. 열람은 /api/documents/[id]/file (서명 URL)
    await prisma.document.update({
      where: { id: documentId },
      data: { filePath: storagePath },
    });

    // 교체된 이전 파일 정리 (실패해도 업로드 결과에는 영향 없음)
    if (document.filePath) {
      try {
        await removeDocumentFile(document.filePath);
      } catch (error) {
        console.error("Previous file cleanup failed:", document.filePath, error);
      }
    }

    return NextResponse.json({
      success: true,
      filePath: storagePath,
    });
  } catch (error) {
    console.error("POST /api/documents/upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
