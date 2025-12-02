"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Briefcase,
  TrendingUp,
  Edit,
  Plus,
  ArrowLeft,
} from "lucide-react";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatDate,
  STATUS_LABELS,
  INDUSTRY_OPTIONS,
} from "@/lib/utils";

interface ClientDetail {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string | null;
  businessNo: string | null;
  address: string | null;
  industry: string | null;
  status: string;
  memo: string | null;
  createdAt: string;
  projects: Array<{
    id: string;
    name: string;
    status: string;
    startDate: string;
    endDate: string;
    contractAmount: number;
    manager: { name: string } | null;
  }>;
  documents: Array<{
    id: string;
    type: string;
    docNumber: string;
    issueDate: string;
    amount: number;
    status: string;
  }>;
  transactions: Array<{
    id: string;
    type: string;
    category: string;
    amount: number;
    date: string;
    paymentStatus: string;
  }>;
  financialSummary: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    unpaidAmount: number;
  };
}

export default function ClientDetailPage() {
  const params = useParams();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClient() {
      try {
        const res = await fetch(`/api/clients/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setClient(data);
        }
      } catch (error) {
        console.error("Failed to fetch client:", error);
      } finally {
        setLoading(false);
      }
    }
    if (params.id) {
      fetchClient();
    }
  }, [params.id]);

  if (loading) {
    return <ClientDetailSkeleton />;
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-medium">클라이언트를 찾을 수 없습니다</h2>
        <Button asChild className="mt-4">
          <Link href="/clients">목록으로 돌아가기</Link>
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "success" | "warning" | "secondary" | "info" | "destructive"> = {
      ACTIVE: "success",
      DORMANT: "warning",
      TERMINATED: "secondary",
      QUOTING: "info",
      IN_PROGRESS: "info",
      COMPLETED: "success",
      CANCELLED: "destructive",
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
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/clients">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
              {getStatusBadge(client.status)}
            </div>
            <p className="text-muted-foreground mt-1">
              등록일: {formatDate(client.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/projects/new?clientId=${client.id}`}>
              <Plus className="h-4 w-4 mr-2" />
              프로젝트 추가
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/clients/${client.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              수정
            </Link>
          </Button>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              총 매출
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrencyCompact(client.financialSummary.totalRevenue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              총 비용
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrencyCompact(client.financialSummary.totalExpenses)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              순이익
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrencyCompact(client.financialSummary.netProfit)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              미수금
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrencyCompact(client.financialSummary.unpaidAmount)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info" className="gap-2">
            <Building2 className="h-4 w-4" />
            기본 정보
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-2">
            <Briefcase className="h-4 w-4" />
            프로젝트 ({client.projects.length})
          </TabsTrigger>
          <TabsTrigger value="finance" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            재무
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            문서 ({client.documents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground">담당자</label>
                    <p className="font-medium">{client.contactName}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">연락처</label>
                    <p className="font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {client.phone}
                    </p>
                  </div>
                  {client.email && (
                    <div>
                      <label className="text-sm text-muted-foreground">이메일</label>
                      <p className="font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {client.email}
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  {client.businessNo && (
                    <div>
                      <label className="text-sm text-muted-foreground">사업자번호</label>
                      <p className="font-medium">{client.businessNo}</p>
                    </div>
                  )}
                  {client.industry && (
                    <div>
                      <label className="text-sm text-muted-foreground">업종</label>
                      <p className="font-medium">
                        {INDUSTRY_OPTIONS.find((o) => o.value === client.industry)?.label ||
                          client.industry}
                      </p>
                    </div>
                  )}
                  {client.address && (
                    <div>
                      <label className="text-sm text-muted-foreground">주소</label>
                      <p className="font-medium flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {client.address}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              {client.memo && (
                <div className="pt-4 border-t">
                  <label className="text-sm text-muted-foreground">메모</label>
                  <p className="mt-1 whitespace-pre-wrap">{client.memo}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <CardTitle>프로젝트 목록</CardTitle>
              <CardDescription>이 클라이언트의 모든 프로젝트</CardDescription>
            </CardHeader>
            <CardContent>
              {client.projects.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">등록된 프로젝트가 없습니다.</p>
                  <Button asChild className="mt-4">
                    <Link href={`/projects/new?clientId=${client.id}`}>
                      <Plus className="h-4 w-4 mr-2" />
                      프로젝트 추가
                    </Link>
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>프로젝트명</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>기간</TableHead>
                      <TableHead>계약금액</TableHead>
                      <TableHead>담당자</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {client.projects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell>
                          <Link
                            href={`/projects/${project.id}`}
                            className="font-medium hover:text-primary"
                          >
                            {project.name}
                          </Link>
                        </TableCell>
                        <TableCell>{getStatusBadge(project.status)}</TableCell>
                        <TableCell>
                          {formatDate(project.startDate)} ~{" "}
                          {formatDate(project.endDate)}
                        </TableCell>
                        <TableCell>{formatCurrency(project.contractAmount)}</TableCell>
                        <TableCell>{project.manager?.name || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance">
          <Card>
            <CardHeader>
              <CardTitle>거래 내역</CardTitle>
            </CardHeader>
            <CardContent>
              {client.transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  거래 내역이 없습니다.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>일자</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead>카테고리</TableHead>
                      <TableHead className="text-right">금액</TableHead>
                      <TableHead>상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {client.transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>{formatDate(tx.date)}</TableCell>
                        <TableCell>
                          <Badge variant={tx.type === "REVENUE" ? "success" : "destructive"}>
                            {tx.type === "REVENUE" ? "수익" : "비용"}
                          </Badge>
                        </TableCell>
                        <TableCell>{tx.category}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(tx.amount)}
                        </TableCell>
                        <TableCell>{getStatusBadge(tx.paymentStatus)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>문서 목록</CardTitle>
            </CardHeader>
            <CardContent>
              {client.documents.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  등록된 문서가 없습니다.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>문서번호</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead>발행일</TableHead>
                      <TableHead className="text-right">금액</TableHead>
                      <TableHead>상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {client.documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.docNumber}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {doc.type === "TAX_INVOICE"
                              ? "세금계산서"
                              : doc.type === "QUOTE"
                              ? "견적서"
                              : doc.type === "CONTRACT"
                              ? "계약서"
                              : "기타"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(doc.issueDate)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(doc.amount)}
                        </TableCell>
                        <TableCell>{getStatusBadge(doc.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ClientDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-16" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}


