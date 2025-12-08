"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  FileText,
  Download,
  MoreHorizontal,
  Trash2,
  Loader2,
  Upload,
  File,
  ExternalLink,
  Calculator,
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
  client: { name: string };
  project: { name: string } | null;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [typeFilter]);

  async function fetchDocuments() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);

      const res = await fetch(`/api/documents?${params}`);
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/documents/${deletingId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setIsDeleteDialogOpen(false);
        fetchDocuments();
      } else {
        alert("삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  const openDeleteDialog = (id: string) => {
    setDeletingId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleFileUpload = async (documentId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentId", documentId);

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        fetchDocuments();
      } else {
        alert("파일 업로드에 실패했습니다.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("업로드 중 오류가 발생했습니다.");
    }
  };

  const handleDownload = (filePath: string, docNumber: string) => {
    const link = document.createElement("a");
    link.href = filePath;
    link.download = `${docNumber}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">문서 관리</h1>
          <p className="text-muted-foreground mt-1">
            견적서, 세금계산서, 계약서를 관리합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/documents/quote-generator">
              <Calculator className="h-4 w-4 mr-2" />
              견적서 만들기
            </Link>
          </Button>
          <Button asChild>
            <Link href="/documents/new">
              <Plus className="h-4 w-4 mr-2" />
              새 문서
            </Link>
          </Button>
        </div>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="문서 유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="QUOTE">견적서</SelectItem>
                <SelectItem value="TAX_INVOICE">세금계산서</SelectItem>
                <SelectItem value="CONTRACT">계약서</SelectItem>
                <SelectItem value="BUSINESS_REG">사업자등록증</SelectItem>
                <SelectItem value="BANK_ACCOUNT">통장사본</SelectItem>
                <SelectItem value="EMAIL_DOC">이메일/서신</SelectItem>
                <SelectItem value="ID_CARD">신분증</SelectItem>
                <SelectItem value="OTHER">기타</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>문서 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">문서가 없습니다</h3>
              <p className="text-muted-foreground mt-1">
                새 문서를 등록하여 시작하세요.
              </p>
              <Button asChild className="mt-4">
                <Link href="/documents/new">
                  <Plus className="h-4 w-4 mr-2" />
                  새 문서 등록
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>문서번호</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>클라이언트</TableHead>
                  <TableHead>프로젝트</TableHead>
                  <TableHead>발행일</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>파일</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id} className="group">
                    <TableCell className="font-medium">{doc.docNumber}</TableCell>
                    <TableCell>{getTypeBadge(doc.type)}</TableCell>
                    <TableCell>{doc.client.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {doc.project?.name || "-"}
                    </TableCell>
                    <TableCell>{formatDate(doc.issueDate)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(doc.amount)}
                    </TableCell>
                    <TableCell>{getStatusBadge(doc.status)}</TableCell>
                    <TableCell>
                      {doc.filePath ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownload(doc.filePath!, doc.docNumber)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          다운로드
                        </Button>
                      ) : (
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(doc.id, file);
                            }}
                          />
                          <Button size="sm" variant="ghost" asChild>
                            <span>
                              <Upload className="h-4 w-4 mr-1" />
                              업로드
                            </span>
                          </Button>
                        </label>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {doc.filePath && (
                            <>
                              <DropdownMenuItem
                                onClick={() => window.open(doc.filePath!, "_blank")}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                새 탭에서 보기
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(doc.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
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
