"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Download,
  Upload,
  Trash2,
  FileText,
  Building2,
  Briefcase,
  Calendar,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { formatCurrency, formatDate, STATUS_LABELS } from "@/lib/utils";

interface Document {
  id: string;
  type: string;
  docNumber: string;
  issueDate: string;
  amount: number;
  status: string;
  filePath: string | null;
  memo: string | null;
  client: { id: string; name: string };
  project: { id: string; name: string } | null;
}

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchDocument();
  }, [params.id]);

  async function fetchDocument() {
    try {
      setLoading(true);
      const res = await fetch(`/api/documents/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setDocument(data);
      } else {
        router.push("/documents");
      }
    } catch (error) {
      console.error("Failed to fetch document:", error);
      router.push("/documents");
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/documents/${params.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/documents");
      } else {
        alert("삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!document) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentId", document.id);

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        fetchDocument();
      } else {
        alert("파일 업로드에 실패했습니다.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("업로드 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = () => {
    if (!document?.filePath) return;
    const link = window.document.createElement("a");
    link.href = document.filePath;
    link.download = document.docNumber;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const getTypeBadge = (type: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "info" | "success" }> = {
      QUOTE: { label: "견적서", variant: "secondary" },
      TAX_INVOICE: { label: "세금계산서", variant: "default" },
      CONTRACT: { label: "계약서", variant: "outline" },
      BUSINESS_REG: { label: "사업자등록증", variant: "info" },
      BANK_ACCOUNT: { label: "통장사본", variant: "success" },
      EMAIL_DOC: { label: "이메일/서신", variant: "secondary" },
      ID_CARD: { label: "신분증", variant: "outline" },
      OTHER: { label: "기타", variant: "outline" },
    };
    const { label, variant } = config[type] || { label: type, variant: "outline" as const };
    return <Badge variant={variant as "default" | "secondary" | "outline" | "destructive"}>{label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "success" | "info" | "warning" | "destructive" | "secondary"> = {
      ISSUED: "secondary",
      DELIVERED: "info",
      ACCEPTED: "success",
      REJECTED: "destructive",
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!document) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{document.docNumber}</h1>
              {getTypeBadge(document.type)}
              {getStatusBadge(document.status)}
            </div>
            <p className="text-muted-foreground mt-1">문서 상세 정보</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            삭제
          </Button>
        </div>
      </div>

      {/* Document Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              문서 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">문서번호</span>
              <span className="font-medium">{document.docNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">문서유형</span>
              {getTypeBadge(document.type)}
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">상태</span>
              {getStatusBadge(document.status)}
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">발행일</span>
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDate(document.issueDate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">금액</span>
              <span className="font-semibold text-lg">{formatCurrency(document.amount)}</span>
            </div>
            {document.memo && (
              <div className="pt-4 border-t">
                <span className="text-muted-foreground block mb-2">메모</span>
                <p className="text-sm">{document.memo}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              관련 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-muted-foreground block mb-2">클라이언트</span>
              <Link
                href={`/clients/${document.client.id}`}
                className="flex items-center gap-2 font-medium hover:text-primary transition-colors"
              >
                <Building2 className="h-4 w-4" />
                {document.client?.name || "클라이언트 미지정"}
              </Link>
            </div>
            {document.project && (
              <div>
                <span className="text-muted-foreground block mb-2">프로젝트</span>
                <Link
                  href={`/projects/${document.project.id}`}
                  className="flex items-center gap-2 font-medium hover:text-primary transition-colors"
                >
                  <Briefcase className="h-4 w-4" />
                  {document.project.name}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* File Section */}
      <Card>
        <CardHeader>
          <CardTitle>첨부 파일</CardTitle>
        </CardHeader>
        <CardContent>
          {document.filePath ? (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">{document.docNumber}</p>
                  <p className="text-sm text-muted-foreground">첨부된 파일</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  다운로드
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(document.filePath!, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  새 탭에서 보기
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">첨부된 파일이 없습니다</p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  disabled={isUploading}
                />
                <Button asChild disabled={isUploading}>
                  <span>
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    파일 업로드
                  </span>
                </Button>
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>문서 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 문서를 삭제하시겠습니까? 첨부된 파일도 함께 삭제됩니다.
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
