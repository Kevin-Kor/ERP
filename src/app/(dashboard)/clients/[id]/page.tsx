"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  CalendarDays,
  Trash2,
  Video,
  CreditCard,
  StickyNote,
  ClipboardList,
} from "lucide-react";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatDate,
  STATUS_LABELS,
  INDUSTRY_OPTIONS,
} from "@/lib/utils";

// 클라이언트 관리 기록 타입
interface VisitRecord {
  id: string;
  date: string;
  memo: string;
}

interface MonthlyPayment {
  month: string; // YYYY-MM format
  deposit: boolean; // 선금
  balance: boolean; // 착수금/잔금
  memo: string;
}

interface VideoStatus {
  id: string;
  title: string;
  completed: boolean;
  completedDate: string | null;
  memo: string;
}

interface ClientManagementRecord {
  visits: VisitRecord[];
  payments: MonthlyPayment[];
  videos: VideoStatus[];
  generalMemo: string;
}

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

const defaultManagementRecord: ClientManagementRecord = {
  visits: [],
  payments: [],
  videos: [],
  generalMemo: "",
};

export default function ClientDetailPage() {
  const params = useParams();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // 관리 기록 상태
  const [managementRecord, setManagementRecord] = useState<ClientManagementRecord>(defaultManagementRecord);
  const [isVisitDialogOpen, setIsVisitDialogOpen] = useState(false);
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [newVisitDate, setNewVisitDate] = useState("");
  const [newVisitMemo, setNewVisitMemo] = useState("");
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [newVideoMemo, setNewVideoMemo] = useState("");
  const [newPaymentMonth, setNewPaymentMonth] = useState("");

  // LocalStorage 키
  const getStorageKey = useCallback(() => {
    return `client-management-${params.id}`;
  }, [params.id]);

  // 관리 기록 불러오기
  const loadManagementRecord = useCallback(() => {
    if (typeof window !== "undefined" && params.id) {
      const saved = localStorage.getItem(getStorageKey());
      if (saved) {
        try {
          setManagementRecord(JSON.parse(saved));
        } catch {
          setManagementRecord(defaultManagementRecord);
        }
      }
    }
  }, [getStorageKey, params.id]);

  // 관리 기록 저장
  const saveManagementRecord = useCallback((record: ClientManagementRecord) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(getStorageKey(), JSON.stringify(record));
    }
  }, [getStorageKey]);

  // 방문 기록 추가
  const addVisitRecord = () => {
    if (!newVisitDate) return;
    const newRecord: VisitRecord = {
      id: Date.now().toString(),
      date: newVisitDate,
      memo: newVisitMemo,
    };
    const updated = {
      ...managementRecord,
      visits: [...managementRecord.visits, newRecord].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    };
    setManagementRecord(updated);
    saveManagementRecord(updated);
    setNewVisitDate("");
    setNewVisitMemo("");
    setIsVisitDialogOpen(false);
  };

  // 방문 기록 삭제
  const deleteVisitRecord = (id: string) => {
    const updated = {
      ...managementRecord,
      visits: managementRecord.visits.filter((v) => v.id !== id),
    };
    setManagementRecord(updated);
    saveManagementRecord(updated);
  };

  // 월별 결제 추가
  const addPaymentMonth = () => {
    if (!newPaymentMonth) return;
    const exists = managementRecord.payments.find((p) => p.month === newPaymentMonth);
    if (exists) {
      alert("이미 등록된 월입니다.");
      return;
    }
    const newPayment: MonthlyPayment = {
      month: newPaymentMonth,
      deposit: false,
      balance: false,
      memo: "",
    };
    const updated = {
      ...managementRecord,
      payments: [...managementRecord.payments, newPayment].sort((a, b) =>
        b.month.localeCompare(a.month)
      ),
    };
    setManagementRecord(updated);
    saveManagementRecord(updated);
    setNewPaymentMonth("");
    setIsPaymentDialogOpen(false);
  };

  // 월별 결제 상태 업데이트
  const updatePayment = (month: string, field: keyof MonthlyPayment, value: boolean | string) => {
    const updated = {
      ...managementRecord,
      payments: managementRecord.payments.map((p) =>
        p.month === month ? { ...p, [field]: value } : p
      ),
    };
    setManagementRecord(updated);
    saveManagementRecord(updated);
  };

  // 월별 결제 삭제
  const deletePayment = (month: string) => {
    const updated = {
      ...managementRecord,
      payments: managementRecord.payments.filter((p) => p.month !== month),
    };
    setManagementRecord(updated);
    saveManagementRecord(updated);
  };

  // 영상 추가
  const addVideo = () => {
    if (!newVideoTitle) return;
    const newVideo: VideoStatus = {
      id: Date.now().toString(),
      title: newVideoTitle,
      completed: false,
      completedDate: null,
      memo: newVideoMemo,
    };
    const updated = {
      ...managementRecord,
      videos: [...managementRecord.videos, newVideo],
    };
    setManagementRecord(updated);
    saveManagementRecord(updated);
    setNewVideoTitle("");
    setNewVideoMemo("");
    setIsVideoDialogOpen(false);
  };

  // 영상 완료 상태 토글
  const toggleVideoComplete = (id: string) => {
    const updated = {
      ...managementRecord,
      videos: managementRecord.videos.map((v) =>
        v.id === id
          ? {
              ...v,
              completed: !v.completed,
              completedDate: !v.completed ? new Date().toISOString().split("T")[0] : null,
            }
          : v
      ),
    };
    setManagementRecord(updated);
    saveManagementRecord(updated);
  };

  // 영상 삭제
  const deleteVideo = (id: string) => {
    const updated = {
      ...managementRecord,
      videos: managementRecord.videos.filter((v) => v.id !== id),
    };
    setManagementRecord(updated);
    saveManagementRecord(updated);
  };

  // 일반 메모 업데이트
  const updateGeneralMemo = (memo: string) => {
    const updated = { ...managementRecord, generalMemo: memo };
    setManagementRecord(updated);
    saveManagementRecord(updated);
  };

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
      loadManagementRecord();
    }
  }, [params.id, loadManagementRecord]);

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
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="info" className="gap-2">
            <Building2 className="h-4 w-4" />
            기본 정보
          </TabsTrigger>
          <TabsTrigger value="management" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            관리 기록
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

        {/* 관리 기록 탭 */}
        <TabsContent value="management">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* 방문 기록 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5" />
                    방문 기록
                  </CardTitle>
                  <CardDescription>클라이언트 방문 일자를 기록합니다.</CardDescription>
                </div>
                <Dialog open={isVisitDialogOpen} onOpenChange={setIsVisitDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      추가
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>방문 기록 추가</DialogTitle>
                      <DialogDescription>방문 일자와 메모를 입력하세요.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="visitDate">방문일 *</Label>
                        <Input
                          id="visitDate"
                          type="date"
                          value={newVisitDate}
                          onChange={(e) => setNewVisitDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="visitMemo">메모</Label>
                        <Textarea
                          id="visitMemo"
                          value={newVisitMemo}
                          onChange={(e) => setNewVisitMemo(e.target.value)}
                          placeholder="방문 관련 메모..."
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsVisitDialogOpen(false)}>
                        취소
                      </Button>
                      <Button onClick={addVisitRecord} disabled={!newVisitDate}>
                        추가
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {managementRecord.visits.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">
                    등록된 방문 기록이 없습니다.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {managementRecord.visits.map((visit) => (
                      <div
                        key={visit.id}
                        className="flex items-start justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{formatDate(visit.date)}</p>
                          {visit.memo && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {visit.memo}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteVisitRecord(visit.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 월별 결제 현황 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    월별 결제 현황
                  </CardTitle>
                  <CardDescription>월별 선금/착수금 결제 여부를 체크합니다.</CardDescription>
                </div>
                <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      월 추가
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>결제 월 추가</DialogTitle>
                      <DialogDescription>관리할 월을 선택하세요.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="paymentMonth">월 선택 *</Label>
                        <Input
                          id="paymentMonth"
                          type="month"
                          value={newPaymentMonth}
                          onChange={(e) => setNewPaymentMonth(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                        취소
                      </Button>
                      <Button onClick={addPaymentMonth} disabled={!newPaymentMonth}>
                        추가
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {managementRecord.payments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">
                    등록된 결제 월이 없습니다.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {managementRecord.payments.map((payment) => {
                      const [year, month] = payment.month.split("-");
                      return (
                        <div
                          key={payment.month}
                          className="p-3 border rounded-lg space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {year}년 {month}월
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deletePayment(payment.month)}
                              className="text-destructive hover:text-destructive h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex gap-6">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`deposit-${payment.month}`}
                                checked={payment.deposit}
                                onCheckedChange={(checked) =>
                                  updatePayment(payment.month, "deposit", checked as boolean)
                                }
                              />
                              <Label
                                htmlFor={`deposit-${payment.month}`}
                                className="cursor-pointer"
                              >
                                선금
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`balance-${payment.month}`}
                                checked={payment.balance}
                                onCheckedChange={(checked) =>
                                  updatePayment(payment.month, "balance", checked as boolean)
                                }
                              />
                              <Label
                                htmlFor={`balance-${payment.month}`}
                                className="cursor-pointer"
                              >
                                착수금/잔금
                              </Label>
                            </div>
                          </div>
                          <Input
                            placeholder="메모 입력..."
                            value={payment.memo}
                            onChange={(e) =>
                              updatePayment(payment.month, "memo", e.target.value)
                            }
                            className="text-sm"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 영상 완료 현황 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    영상 완료 현황
                  </CardTitle>
                  <CardDescription>영상 제작 완료 여부를 체크합니다.</CardDescription>
                </div>
                <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      추가
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>영상 추가</DialogTitle>
                      <DialogDescription>관리할 영상 정보를 입력하세요.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="videoTitle">영상 제목 *</Label>
                        <Input
                          id="videoTitle"
                          value={newVideoTitle}
                          onChange={(e) => setNewVideoTitle(e.target.value)}
                          placeholder="예: 12월 콘텐츠 1차"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="videoMemo">메모</Label>
                        <Textarea
                          id="videoMemo"
                          value={newVideoMemo}
                          onChange={(e) => setNewVideoMemo(e.target.value)}
                          placeholder="영상 관련 메모..."
                          rows={2}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsVideoDialogOpen(false)}>
                        취소
                      </Button>
                      <Button onClick={addVideo} disabled={!newVideoTitle}>
                        추가
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {managementRecord.videos.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">
                    등록된 영상이 없습니다.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {managementRecord.videos.map((video) => (
                      <div
                        key={video.id}
                        className={`flex items-start justify-between p-3 border rounded-lg ${
                          video.completed ? "bg-green-50 border-green-200" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={video.completed}
                            onCheckedChange={() => toggleVideoComplete(video.id)}
                            className="mt-1"
                          />
                          <div>
                            <p
                              className={`font-medium ${
                                video.completed ? "line-through text-muted-foreground" : ""
                              }`}
                            >
                              {video.title}
                            </p>
                            {video.memo && (
                              <p className="text-sm text-muted-foreground">{video.memo}</p>
                            )}
                            {video.completed && video.completedDate && (
                              <p className="text-xs text-green-600 mt-1">
                                완료: {formatDate(video.completedDate)}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteVideo(video.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 일반 메모 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StickyNote className="h-5 w-5" />
                  관리 메모
                </CardTitle>
                <CardDescription>클라이언트 관련 메모를 자유롭게 작성합니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={managementRecord.generalMemo}
                  onChange={(e) => updateGeneralMemo(e.target.value)}
                  placeholder="클라이언트 관련 메모를 입력하세요..."
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  자동 저장됩니다.
                </p>
              </CardContent>
            </Card>
          </div>
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


