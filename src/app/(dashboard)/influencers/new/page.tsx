"use client";

import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Loader2, Instagram, Youtube, Globe } from "lucide-react";
import { INFLUENCER_CATEGORIES } from "@/lib/utils";

export default function NewInfluencerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

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

  const handleCategoryChange = (category: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories([...selectedCategories, category]);
    } else {
      setSelectedCategories(selectedCategories.filter((c) => c !== category));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.phone) {
      alert("이름과 연락처는 필수입니다.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/influencers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          followerCount: formData.followerCount
            ? parseInt(formData.followerCount)
            : null,
          categories: selectedCategories.join(",") || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "인플루언서 등록에 실패했습니다.");
      }

      const influencer = await res.json();
      router.push(`/influencers/${influencer.id}`);
      router.refresh();
    } catch (error) {
      console.error("Submit error:", error);
      alert(
        error instanceof Error ? error.message : "인플루언서 등록에 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/influencers">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            새 인플루언서 등록
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            협업할 인플루언서 정보를 입력하세요.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 기본 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
              <CardDescription>인플루언서의 기본 정보를 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="인플루언서 이름"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">연락처 *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
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
                  onChange={(e) =>
                    setFormData({ ...formData, memo: e.target.value })
                  }
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
              <CardDescription>소셜 미디어 계정 정보를 입력하세요.</CardDescription>
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
                  placeholder="https://youtube.com/@channel"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="blog" className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-green-500" />
                  블로그
                </Label>
                <Input
                  id="blog"
                  value={formData.blog}
                  onChange={(e) =>
                    setFormData({ ...formData, blog: e.target.value })
                  }
                  placeholder="https://blog.naver.com/username"
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
                  placeholder="팔로워 수 (숫자만)"
                />
                <p className="text-xs text-muted-foreground">
                  주요 플랫폼의 팔로워/구독자 수를 입력하세요.
                </p>
              </div>

              {/* 카테고리 */}
              <div className="space-y-3">
                <Label>카테고리</Label>
                <div className="grid grid-cols-2 gap-3">
                  {INFLUENCER_CATEGORIES.map((category) => (
                    <div key={category.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={category.value}
                        checked={selectedCategories.includes(category.value)}
                        onCheckedChange={(checked) =>
                          handleCategoryChange(category.value, checked as boolean)
                        }
                      />
                      <label
                        htmlFor={category.value}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {category.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit Buttons */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-6">
          <Button type="button" variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/influencers">취소</Link>
          </Button>
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {loading ? "등록 중..." : "인플루언서 등록"}
          </Button>
        </div>
      </form>
    </div>
  );
}

