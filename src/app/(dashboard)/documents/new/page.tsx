"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Upload,
  FileText,
  Loader2,
  X,
  File,
  Image as ImageIcon,
} from "lucide-react";

interface Client {
  id: string;
  name: string;
  businessNo: string | null;
}

interface Project {
  id: string;
  name: string;
}

const DOCUMENT_TYPES = [
  { value: "QUOTE", label: "견적서", description: "프로젝트 견적서" },
  { value: "TAX_INVOICE", label: "세금계산서", description: "세금계산서" },
  { value: "CONTRACT", label: "계약서", description: "프로젝트 계약서" },
  { value: "BUSINESS_REG", label: "사업자등록증", description: "클라이언트 사업자등록증" },
  { value: "BANK_ACCOUNT", label: "통장사본", description: "입금계좌 통장사본" },
  { value: "EMAIL_DOC", label: "이메일/서신", description: "이메일 주소 또는 서신 사본" },
  { value: "ID_CARD", label: "신분증", description: "대표자 신분증 사본" },
  { value: "OTHER", label: "기타", description: "기타 문서" },
];

export default function NewDocumentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    clientId: "",
    projectId: "",
    type: "",
    docNumber: "",
    issueDate: new Date().toISOString().split("T")[0],
    amount: 0,
    memo: "",
  });

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (formData.clientId) {
      fetchProjects(formData.clientId);
    } else {
      setProjects([]);
    }
  }, [formData.clientId]);

  async function fetchClients() {
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      setClients(data.clients || []);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    }
  }

  async function fetchProjects(clientId: string) {
    try {
      const res = await fetch(`/api/projects?clientId=${clientId}`);
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);

      // Create preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <ImageIcon className="h-8 w-8 text-blue-500" />;
    }
    return <File className="h-8 w-8 text-orange-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientId || !formData.type) {
      alert("클라이언트와 문서 유형을 선택해주세요.");
      return;
    }

    setLoading(true);

    try {
      // First, create the document record
      const docRes = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          projectId: formData.projectId || null,
        }),
      });

      if (!docRes.ok) {
        const error = await docRes.json();
        throw new Error(error.error || "문서 생성에 실패했습니다.");
      }

      const document = await docRes.json();

      // If file is selected, upload it
      if (selectedFile) {
        setUploading(true);
        const formDataUpload = new FormData();
        formDataUpload.append("file", selectedFile);
        formDataUpload.append("documentId", document.id);

        const uploadRes = await fetch("/api/documents/upload", {
          method: "POST",
          body: formDataUpload,
        });

        if (!uploadRes.ok) {
          console.error("File upload failed, but document was created");
        }
      }

      router.push("/documents");
      router.refresh();
    } catch (error) {
      console.error("Submit error:", error);
      alert(error instanceof Error ? error.message : "문서 등록에 실패했습니다.");
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  // Auto-generate document number based on type
  const generateDocNumber = (type: string) => {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prefix: Record<string, string> = {
      QUOTE: "EST",
      TAX_INVOICE: "TAX",
      CONTRACT: "CON",
      BUSINESS_REG: "BRG",
      BANK_ACCOUNT: "BNK",
      EMAIL_DOC: "EML",
      ID_CARD: "IDC",
      OTHER: "DOC",
    };
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    return `${prefix[type] || "DOC"}-${yearMonth}-${randomNum}`;
  };

  useEffect(() => {
    if (formData.type && !formData.docNumber) {
      setFormData((prev) => ({
        ...prev,
        docNumber: generateDocNumber(formData.type),
      }));
    }
  }, [formData.type]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/documents">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">새 문서 등록</h1>
          <p className="text-muted-foreground mt-1">
            클라이언트 문서를 등록하고 파일을 업로드합니다.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 기본 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
              <CardDescription>문서의 기본 정보를 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientId">클라이언트 *</Label>
                <Select
                  value={formData.clientId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, clientId: value, projectId: "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="클라이언트 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                        {client.businessNo && (
                          <span className="text-muted-foreground ml-2">
                            ({client.businessNo})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectId">프로젝트 (선택)</Label>
                <Select
                  value={formData.projectId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, projectId: value })
                  }
                  disabled={!formData.clientId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="프로젝트 선택 (선택사항)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">없음</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">문서 유형 *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value, docNumber: generateDocNumber(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="문서 유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex flex-col">
                          <span>{type.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {type.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="docNumber">문서번호</Label>
                  <Input
                    id="docNumber"
                    value={formData.docNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, docNumber: e.target.value })
                    }
                    placeholder="자동 생성됨"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="issueDate">발행일</Label>
                  <Input
                    id="issueDate"
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) =>
                      setFormData({ ...formData, issueDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">금액 (원)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: Number(e.target.value) })
                  }
                  placeholder="금액이 있는 경우 입력"
                />
                <p className="text-xs text-muted-foreground">
                  금액이 없는 문서(사업자등록증, 통장사본 등)는 0으로 두세요.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="memo">메모</Label>
                <Textarea
                  id="memo"
                  value={formData.memo}
                  onChange={(e) =>
                    setFormData({ ...formData, memo: e.target.value })
                  }
                  placeholder="추가 정보나 메모를 입력하세요"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* 파일 업로드 */}
          <Card>
            <CardHeader>
              <CardTitle>파일 업로드</CardTitle>
              <CardDescription>
                문서 파일을 업로드하세요 (PDF, 이미지, 문서 파일)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedFile ? (
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp"
                    onChange={handleFileChange}
                  />
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-primary/50 transition-colors">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">파일을 선택하거나 드래그하세요</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      PDF, 이미지 (JPG, PNG), 문서 (DOC, XLS) 지원
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      최대 10MB까지 업로드 가능
                    </p>
                  </div>
                </label>
              ) : (
                <div className="border rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    {filePreview ? (
                      <img
                        src={filePreview}
                        alt="Preview"
                        className="w-24 h-24 object-cover rounded-lg border"
                      />
                    ) : (
                      <div className="w-24 h-24 flex items-center justify-center bg-muted rounded-lg">
                        {getFileIcon(selectedFile)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(selectedFile.size)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedFile.type || "알 수 없는 형식"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={removeFile}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium text-sm mb-2">💡 문서 유형별 안내</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>사업자등록증:</strong> 클라이언트의 사업자등록증 사본</li>
                  <li>• <strong>통장사본:</strong> 입금 받을 계좌의 통장 사본</li>
                  <li>• <strong>이메일/서신:</strong> 중요 이메일 캡처 또는 서신 사본</li>
                  <li>• <strong>계약서:</strong> 서명된 계약서 스캔본</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" asChild>
            <Link href="/documents">취소</Link>
          </Button>
          <Button type="submit" disabled={loading || uploading}>
            {(loading || uploading) && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {uploading ? "업로드 중..." : loading ? "저장 중..." : "문서 등록"}
          </Button>
        </div>
      </form>
    </div>
  );
}

