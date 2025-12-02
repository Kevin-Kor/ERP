"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Search,
  UserCircle,
  Instagram,
  Briefcase,
} from "lucide-react";
import { formatCurrency, INFLUENCER_CATEGORIES } from "@/lib/utils";

interface Influencer {
  id: string;
  name: string;
  instagramId: string | null;
  followerCount: number | null;
  categories: string | null;
  phone: string;
  priceRange: string | null;
  _count: { projectInfluencers: number };
  projectInfluencers: Array<{ fee: number; paymentStatus: string }>;
}

export default function InfluencersPage() {
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchInfluencers();
  }, []);

  async function fetchInfluencers() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const res = await fetch(`/api/influencers?${params}`);
      const data = await res.json();
      setInfluencers(data.influencers);
    } catch (error) {
      console.error("Failed to fetch influencers:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchInfluencers();
  }

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">인플루언서</h1>
          <p className="text-muted-foreground mt-1">
            협업 인플루언서를 관리합니다.
          </p>
        </div>
        <Button asChild>
          <Link href="/influencers/new">
            <Plus className="h-4 w-4 mr-2" />
            새 인플루언서
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="이름, 인스타그램 ID, 연락처로 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" variant="secondary">
              검색
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Influencer List */}
      <Card>
        <CardHeader>
          <CardTitle>인플루언서 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : influencers.length === 0 ? (
            <div className="text-center py-12">
              <UserCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">인플루언서가 없습니다</h3>
              <p className="text-muted-foreground mt-1">
                새 인플루언서를 추가하여 시작하세요.
              </p>
              <Button asChild className="mt-4">
                <Link href="/influencers/new">
                  <Plus className="h-4 w-4 mr-2" />
                  새 인플루언서 추가
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>SNS</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead>팔로워</TableHead>
                  <TableHead>단가</TableHead>
                  <TableHead>협업 수</TableHead>
                  <TableHead>총 정산</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {influencers.map((influencer) => {
                  const totalSettlement = influencer.projectInfluencers
                    .filter((pi) => pi.paymentStatus === "COMPLETED")
                    .reduce((sum, pi) => sum + pi.fee, 0);

                  return (
                    <TableRow key={influencer.id} className="group">
                      <TableCell>
                        <Link
                          href={`/influencers/${influencer.id}`}
                          className="font-medium hover:text-primary transition-colors"
                        >
                          {influencer.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {influencer.instagramId && (
                          <span className="flex items-center gap-1 text-sm">
                            <Instagram className="h-3 w-3" />
                            {influencer.instagramId}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {getCategoryLabels(influencer.categories).slice(0, 2).map((cat) => (
                            <Badge key={cat} variant="outline" className="text-xs">
                              {cat}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{formatFollowers(influencer.followerCount)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {influencer.priceRange || "-"}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {influencer._count.projectInfluencers}건
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(totalSettlement)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


