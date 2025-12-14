"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Globe, Instagram, Loader2, PlusCircle, Trash2, Youtube } from "lucide-react";

import { INFLUENCER_CATEGORIES } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface InfluencerResponse {
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
  projectInfluencers?: Array<{
    id: string;
    project: { id: string; name: string };
    fee: number;
    paymentStatus: string;
  }>;
}

type SettlementStatus = "pending" | "in_progress" | "completed";

interface ProjectOption {
  id: string;
  name: string;
}

const normalizeStatus = (status?: string): SettlementStatus => {
  const value = (status || "").toLowerCase();
  if (value === "completed") return "completed";
  if (value === "in_progress" || value === "requested") return "in_progress";
  return "pending";
};

export default function EditInfluencerPage() {
  const router = useRouter();
  const params = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [projectAssignments, setProjectAssignments] = useState<
    { projectId: string; fee: string; paymentStatus: SettlementStatus }[]
  >([]);
  const [formData, setFormData] = useState({
    name: "",
    instagramId: "",
    youtubeChannel: "",
    blog: "",
    followerCount: "",
    phone: "",
    bankAccount: "",
    priceRange: "",
    memo: "",
  });

  useEffect(() => {
    async function fetchInfluencer() {
      try {
        setLoading(true);
        const res = await fetch(`/api/influencers/${params.id}`);

        if (!res.ok) {
          throw new Error("인플루언서를 불러오지 못했습니다.");
        }

        const data: InfluencerResponse = await res.json();
        setFormData({
          name: data.name || "",
          instagramId: data.instagramId || "",
          youtubeChannel: data.youtubeChannel || "",
          blog: data.blog || "",
          followerCount: data.followerCount ? String(data.followerCount) : "",
          phone: data.phone || "",
          bankAccount: data.bankAccount || "",
          priceRange: data.priceRange || "",
          memo: data.memo || "",
        });
        setSelectedCategories(data.categories ? data.categories.split(",") : []);
        setProjectAssignments(
          (data.projectInfluencers || []).map((pi) => ({
            projectId: pi.project.id,
            fee: String(pi.fee ?? ""),
            paymentStatus: normalizeStatus(pi.paymentStatus),
          }))
        );
      } catch (error) {
        console.error(error);
        alert("인플루언서를 불러오지 못했습니다. 목록으로 돌아갑니다.");
        router.push("/influencers");
      } finally {
        setLoading(false);
      }
    }

    fetchInfluencer();
  }, [params.id, router]);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch("/api/projects");
        const data = await res.json();
        setProjectOptions(
          (data.projects || []).map((project: any) => ({
            id: project.id,
            name: project.name,
          }))
        );
      } catch (error) {
        console.error("Failed to load projects", error);
      }
    }

    fetchProjects();
  }, []);

  const handleCategoryChange = (category: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories((prev) => [...prev, category]);
    } else {
      setSelectedCategories((prev) => prev.filter((c) => c !== category));
    }
  };

  const updateAssignment = (
    index: number,
    field: "projectId" | "fee" | "paymentStatus",
    value: string
  ) => {
    setProjectAssignments((prev) =>
      prev.map((assignment, i) =>
        i === index ? { ...assignment, [field]: value } : assignment
      )
    );
  };

  const addAssignmentRow = () => {
    setProjectAssignments((prev) => [
      ...prev,
      { projectId: "", fee: "", paymentStatus: "pending" },
    ]);
  };

  const removeAssignmentRow = (index: number) => {
    setProjectAssignments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.phone) {
      alert("이름과 연락처는 필수입니다.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/influencers/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          followerCount: formData.followerCount
            ? parseInt(formData.followerCount)
            : null,
          categories: selectedCategories.join(",") || null,
          projectAssignments: projectAssignments
            .filter((assignment) => assignment.projectId)
            .map((assignment) => ({
              projectId: assignment.projectId,
              fee: assignment.fee ? Number(assignment.fee) : 0,
              paymentStatus: assignment.paymentStatus,
            })),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "인플루언서 수정에 실패했습니다.");
      }

      router.push(`/influencers/${params.id}`);
      router.refresh();
    } catch (error) {
      console.error("Submit error:", error);
      alert(error instanceof Error ? error.message : "인플루언서 수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/influencers/${params.id}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            인플루언서 수정
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            인플루언서 정보를 수정합니다.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 기본 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
              <CardDescription>인플루언서의 기본 정보를 수정하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="인플루언서 이름"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">연락처 *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="010-0000-0000"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankAccount">계좌 정보</Label>
                <Input
                  id="bankAccount"
                  value={formData.bankAccount}
                  onChange={(e) =>
                    setFormData({ ...formData, bankAccount: e.target.value })
                  }
                  placeholder="은행명 계좌번호 예금주"
                />
                <p className="text-xs text-muted-foreground">
                  예: 국민은행 123-456-789012 홍길동
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priceRange">단가 정보</Label>
                <Input
                  id="priceRange"
                  value={formData.priceRange}
                  onChange={(e) =>
                    setFormData({ ...formData, priceRange: e.target.value })
                  }
                  placeholder="피드 30만, 릴스 50만"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="memo">메모</Label>
                <Textarea
                  id="memo"
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  placeholder="특이사항, 협업 시 참고사항 등"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* SNS 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>SNS 정보</CardTitle>
              <CardDescription>소셜 미디어 계정 정보를 수정하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instagramId" className="flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-pink-500" />
                  인스타그램 ID
                </Label>
                <Input
                  id="instagramId"
                  value={formData.instagramId}
                  onChange={(e) =>
                    setFormData({ ...formData, instagramId: e.target.value })
                  }
                  placeholder="@username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="youtubeChannel" className="flex items-center gap-2">
                  <Youtube className="h-4 w-4 text-red-500" />
                  유튜브 채널
                </Label>
                <Input
                  id="youtubeChannel"
                  value={formData.youtubeChannel}
                  onChange={(e) =>
                    setFormData({ ...formData, youtubeChannel: e.target.value })
                  }
                  placeholder="채널 URL"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="blog" className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-green-500" />
                  블로그/기타
                </Label>
                <Input
                  id="blog"
                  value={formData.blog}
                  onChange={(e) => setFormData({ ...formData, blog: e.target.value })}
                  placeholder="블로그나 기타 링크"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="followerCount">팔로워 수</Label>
                <Input
                  id="followerCount"
                  type="number"
                  value={formData.followerCount}
                  onChange={(e) =>
                    setFormData({ ...formData, followerCount: e.target.value })
                  }
                  placeholder="숫자만 입력"
                />
                <p className="text-xs text-muted-foreground">
                  예: 150000 (15만)
                </p>
              </div>

              <div className="space-y-2">
                <Label>카테고리</Label>
                <div className="flex flex-wrap gap-3">
                  {INFLUENCER_CATEGORIES.map((category) => (
                    <label
                      key={category.value}
                      className="flex items-center space-x-2 text-sm"
                    >
                      <Checkbox
                        checked={selectedCategories.includes(category.value)}
                        onCheckedChange={(checked) =>
                          handleCategoryChange(category.value, checked === true)
                        }
                      />
                      <span>{category.label}</span>
                    </label>
                  ))}
                </div>
                {selectedCategories.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {selectedCategories.map((category) => {
                      const label =
                        INFLUENCER_CATEGORIES.find((c) => c.value === category)?.label ||
                        category;
                      return (
                        <Badge key={category} variant="secondary">
                          {label}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 프로젝트 및 정산 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>프로젝트 배정</CardTitle>
            <CardDescription>
              참여 중인 프로젝트를 선택하고 정산 상태를 관리하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                수정된 정산 현황은 대시보드와 프로젝트 상세 화면에 함께 반영됩니다.
              </p>
              <Button type="button" variant="outline" onClick={addAssignmentRow} size="sm">
                <PlusCircle className="h-4 w-4 mr-2" /> 추가
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>프로젝트</TableHead>
                  <TableHead>정산 금액</TableHead>
                  <TableHead>정산 상태</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectAssignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-sm text-muted-foreground text-center">
                      연결된 프로젝트가 없습니다. 추가해 주세요.
                    </TableCell>
                  </TableRow>
                ) : (
                  projectAssignments.map((assignment, index) => (
                    <TableRow key={`${assignment.projectId}-${index}`}>
                      <TableCell>
                        <Select
                          value={assignment.projectId}
                          onValueChange={(value) => updateAssignment(index, "projectId", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="프로젝트 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {projectOptions.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={assignment.fee}
                          onChange={(e) => updateAssignment(index, "fee", e.target.value)}
                          min={0}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={assignment.paymentStatus}
                          onValueChange={(value) => updateAssignment(index, "paymentStatus", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">예정</SelectItem>
                            <SelectItem value="in_progress">진행 중</SelectItem>
                            <SelectItem value="completed">완료</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => removeAssignmentRow(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href={`/influencers/${params.id}`}>취소</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            수정 완료
          </Button>
        </div>
      </form>
    </div>
  );
}
