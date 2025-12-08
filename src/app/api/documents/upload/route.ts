import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase";

// Allowed file types
const ALLOWED_TYPES = [
  // PDF
  "application/pdf",
  // Word
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Excel
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // CSV
  "text/csv",
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  // PowerPoint
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Text
  "text/plain",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const documentId = formData.get("documentId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!documentId) {
      return NextResponse.json({ error: "No document ID provided" }, { status: 400 });
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "파일 크기가 50MB를 초과합니다." },
        { status: 400 }
      );
    }

    // Check file type (be lenient - allow if type is empty or matches)
    if (file.type && !ALLOWED_TYPES.includes(file.type)) {
      // Try to determine by extension
      const ext = file.name.split(".").pop()?.toLowerCase();
      const allowedExtensions = [
        "pdf", "doc", "docx", "xls", "xlsx", "csv",
        "jpg", "jpeg", "png", "gif", "webp",
        "ppt", "pptx", "txt"
      ];
      if (!ext || !allowedExtensions.includes(ext)) {
        return NextResponse.json(
          { error: "지원하지 않는 파일 형식입니다." },
          { status: 400 }
        );
      }
    }

    // Verify document exists
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split(".").pop() || "file";
    const safeDocNumber = document.docNumber.replace(/[^a-zA-Z0-9-]/g, "_");
    const filename = `${safeDocNumber}_${timestamp}.${extension}`;
    const storagePath = `documents/${filename}`;

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Get Supabase client
    const supabase = getSupabaseAdmin();

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from("erp-files")
      .upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });

    if (error) {
      console.error("Supabase storage error:", error);
      return NextResponse.json(
        { error: "파일 업로드에 실패했습니다: " + error.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("erp-files")
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;

    // Update document with file path
    await prisma.document.update({
      where: { id: documentId },
      data: { filePath: publicUrl },
    });

    return NextResponse.json({
      success: true,
      filePath: publicUrl,
    });
  } catch (error) {
    console.error("POST /api/documents/upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
