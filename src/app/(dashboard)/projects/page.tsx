"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Search,
  Calendar,
  Briefcase,
  Users,
  Building2,
  Video,
  Instagram,
  Youtube,
  Play,
} from "lucide-react";
import { formatCurrency, formatDate, STATUS_LABELS, PLATFORM_OPTIONS } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  contractAmount: number;
  platforms: string | null;
  client: { id: string; name: string };
  manager: { id: string; name: string } | null;
  _count: {
    projectInfluencers: number;
    documents: number;
  };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchProjects();
  }, [statusFilter]);

  async function fetchProjects() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/projects?${params}`);
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchProjects();
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "success" | "warning" | "info" | "destructive" | "secondary"> = {
      QUOTING: "info",
      IN_PROGRESS: "warning",
      COMPLETED: "success",
      CANCELLED: "destructive",
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status}
      </Badge>
    );
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">프로젝트</h1>
          <p className="text-muted-foreground mt-1">
            숏폼 제작 프로젝트를 관리합니다.
          </p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="h-4 w-4 mr-2" />
            새 프로젝트
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
                placeholder="프로젝트명, 클라이언트로 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="QUOTING">견적중</SelectItem>
                <SelectItem value="IN_PROGRESS">진행중</SelectItem>
                <SelectItem value="COMPLETED">완료</SelectItem>
                <SelectItem value="CANCELLED">취소</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" variant="secondary">
              검색
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">프로젝트가 없습니다</h3>
            <p className="text-muted-foreground mt-1">
              새 프로젝트를 추가하여 시작하세요.
            </p>
            <Button asChild className="mt-4">
              <Link href="/projects/new">
                <Plus className="h-4 w-4 mr-2" />
                새 프로젝트 추가
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const daysRemaining = getDaysRemaining(project.endDate);
            const isUrgent = project.status === "IN_PROGRESS" && daysRemaining <= 7 && daysRemaining > 0;
            const isOverdue = project.status === "IN_PROGRESS" && daysRemaining < 0;

            return (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className={`card-hover cursor-pointer h-full ${isOverdue ? "border-red-300" : isUrgent ? "border-amber-300" : ""}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg line-clamp-1">{project.name}</CardTitle>
                      {getStatusBadge(project.status)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      {project.client?.name || "클라이언트 미지정"}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {formatDate(project.startDate)} ~ {formatDate(project.endDate)}
                      </span>
                    </div>
                    
                    {project.status === "IN_PROGRESS" && (
                      <div className={`text-sm ${isOverdue ? "text-red-600" : isUrgent ? "text-amber-600" : "text-muted-foreground"}`}>
                        {isOverdue
                          ? `D+${Math.abs(daysRemaining)} 경과`
                          : daysRemaining === 0
                          ? "오늘 마감"
                          : `D-${daysRemaining} 남음`}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {project._count.projectInfluencers}명
                      </div>
                      <div className="font-semibold">
                        {formatCurrency(project.contractAmount)}
                      </div>
                    </div>

                    {project.platforms && (
                      <div className="flex flex-wrap gap-1">
                        {project.platforms.split(",").map((platform) => {
                          const platformInfo = PLATFORM_OPTIONS.find(p => p.value === platform);
                          const isShortform = ["INSTAGRAM_REELS", "YOUTUBE_SHORTS", "TIKTOK"].includes(platform);
                          return (
                            <Badge 
                              key={platform} 
                              variant={isShortform ? "default" : "outline"} 
                              className="text-xs flex items-center gap-1"
                            >
                              {platform.includes("INSTAGRAM") && <Instagram className="h-3 w-3" />}
                              {platform.includes("YOUTUBE") && <Youtube className="h-3 w-3" />}
                              {platform === "TIKTOK" && <Play className="h-3 w-3" />}
                              {platformInfo?.label || platform}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}


