"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Instagram,
  Youtube,
  Globe,
  Phone,
  CreditCard,
  Edit,
  Trash2,
  Briefcase,
  DollarSign,
  CheckCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { formatCurrency, formatDate, INFLUENCER_CATEGORIES } from "@/lib/utils";

interface Influencer {
  id: string;
  name: string;
  instagramId: string | null;
  youtubeChannel: string | null;
  blog: string | null;
  followerCount: number | null;
  categories: string | null;
  phone: string;
  bankAccount: string | null;
  priceRange: string | null;
  memo: string | null;
  createdAt: string;
  projectInfluencers: Array<{
    id: string;
    fee: number;
    paymentStatus: string;
    paymentDueDate: string | null;
    paymentDate: string | null;
    project: {
      id: string;
      name: string;
      status: string;
      client: { name: string };
    };
  }>;
}

type SettlementStatus = "pending" | "in_progress" | "completed";

const normalizeStatus = (status?: string): SettlementStatus => {
  const value = (status || "").toLowerCase();
  if (value === "completed") return "completed";
  if (value === "in_progress" || value === "requested") return "in_progress";
  return "pending";
};

export default function InfluencerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [influencer, setInfluencer] = useState<Influencer | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingSettlementId, setUpdatingSettlementId] = useState<string | null>(null);

  const statusOptions: { value: SettlementStatus; label: string }[] = [
    { value: "pending", label: "예정" },
    { value: "in_progress", label: "진행 중" },
    { value: "completed", label: "완료" },
  ];

  const fetchInfluencer = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/influencers/${params.id}`);
      if (!res.ok) {
        throw new Error("Not found");
      }
      const data = await res.json();
      setInfluencer(data);
    } catch (error) {
      console.error("Failed to fetch influencer:", error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchInfluencer();
  }, [fetchInfluencer]);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/influencers/${params.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/influencers");
        router.refresh();
      } else {
        alert("인플루언서 삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }

  const handleSettlementStatusChange = async (
    settlementId: string,
    newStatus: SettlementStatus
  ) => {
    setUpdatingSettlementId(settlementId);
    try {
      await fetch(`/api/settlements/${settlementId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentStatus: newStatus,
          paymentDate: newStatus === "completed" ? new Date().toISOString() : null,
        }),
      });

      await fetchInfluencer();
    } catch (error) {
      console.error("Failed to update settlement status", error);
      alert("정산 상태를 업데이트하지 못했습니다.");
    } finally {
      setUpdatingSettlementId(null);
    }
  };

  const getCategoryLabels = (categories: string | null) => {
    if (!categories) return [];
    return categories.split(",").map((cat) => {
      const found = INFLUENCER_CATEGORIES.find((c) => c.value === cat);
      return found?.label || cat;
    });
  };

  const formatFollowers = (count: number | null) => {
    if (!count) return "-";
    if (count >= 10000) return `${(count / 10000).toFixed(1)}만`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}천`;
    return count.toString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!influencer) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">인플루언서를 찾을 수 없습니다</h2>
        <Button asChild className="mt-4">
          <Link href="/influencers">목록으로 돌아가기</Link>
        </Button>
      </div>
    );
  }

  const totalEarnings = influencer.projectInfluencers
    .filter((pi) => pi.paymentStatus === "COMPLETED")
    .reduce((sum, pi) => sum + pi.fee, 0);

  const pendingPayments = influencer.projectInfluencers
    .filter((pi) => pi.paymentStatus !== "COMPLETED")
    .reduce((sum, pi) => sum + pi.fee, 0);

  const projectCount = influencer.projectInfluencers.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/influencers">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{influencer.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {influencer.instagramId && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Instagram className="h-4 w-4" />
                  {influencer.instagramId}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/influencers/${influencer.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              수정
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                삭제
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>인플루언서 삭제</AlertDialogTitle>
                <AlertDialogDescription>
                  "{influencer.name}" 인플루언서를 삭제하시겠습니까?
                  <br />
                  관련된 프로젝트 배정 내역도 함께 삭제됩니다.
                  <br />
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
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              협업 수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectCount}건</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              정산 완료
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(totalEarnings)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              미정산
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(pendingPayments)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              단가
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{influencer.priceRange || "-"}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">기본 정보</TabsTrigger>
          <TabsTrigger value="projects">협업 이력 ({projectCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>프로필 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">이름</p>
                  <p className="font-medium">{influencer.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">팔로워</p>
                  <p className="font-medium">{formatFollowers(influencer.followerCount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">연락처</p>
                  <p className="font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {influencer.phone}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">카테고리</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {getCategoryLabels(influencer.categories).map((cat) => (
                      <Badge key={cat} variant="outline">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SNS 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {influencer.instagramId && (
                <div className="flex items-center gap-3">
                  <Instagram className="h-5 w-5 text-pink-500" />
                  <span>{influencer.instagramId}</span>
                </div>
              )}
              {influencer.youtubeChannel && (
                <div className="flex items-center gap-3">
                  <Youtube className="h-5 w-5 text-red-500" />
                  <a
                    href={influencer.youtubeChannel}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {influencer.youtubeChannel}
                  </a>
                </div>
              )}
              {influencer.blog && (
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-green-500" />
                  <a
                    href={influencer.blog}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {influencer.blog}
                  </a>
                </div>
              )}
              {!influencer.instagramId && !influencer.youtubeChannel && !influencer.blog && (
                <p className="text-muted-foreground">등록된 SNS 정보가 없습니다.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>정산 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5" />
                <span>{influencer.bankAccount || "등록된 계좌 정보가 없습니다."}</span>
              </div>
            </CardContent>
          </Card>

          {influencer.memo && (
            <Card>
              <CardHeader>
                <CardTitle>메모</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{influencer.memo}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <CardTitle>협업 프로젝트</CardTitle>
              <CardDescription>이 인플루언서와 진행한 프로젝트 목록</CardDescription>
            </CardHeader>
            <CardContent>
              {influencer.projectInfluencers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  협업 이력이 없습니다.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>프로젝트</TableHead>
                      <TableHead>클라이언트</TableHead>
                      <TableHead>금액</TableHead>
                      <TableHead>정산 상태</TableHead>
                      <TableHead>정산일</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {influencer.projectInfluencers.map((pi) => (
                      <TableRow key={pi.id}>
                        <TableCell>
                          <Link
                            href={`/projects/${pi.project.id}`}
                            className="font-medium hover:text-primary"
                          >
                            {pi.project.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {pi.project.client?.name || "클라이언트 미지정"}
                        </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(pi.fee)}
                      </TableCell>
                      <TableCell className="w-[180px]">
                        <Select
                          value={normalizeStatus(pi.paymentStatus)}
                          onValueChange={(value) =>
                            handleSettlementStatusChange(pi.id, value as SettlementStatus)
                          }
                        >
                          <SelectTrigger disabled={updatingSettlementId === pi.id}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                        <TableCell className="text-muted-foreground">
                          {pi.paymentDate
                            ? formatDate(pi.paymentDate)
                            : pi.paymentDueDate
                            ? `예정: ${formatDate(pi.paymentDueDate)}`
                            : "-"}
                        </TableCell>
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

