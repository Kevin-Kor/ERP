"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  Loader2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { GoogleCalendarSync } from "@/components/google-calendar-sync";
import { useToast } from "@/components/ui/use-toast";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  endDate: string | null;
  type: string;
  color: string | null;
  memo: string | null;
  project: { id: string; name: string } | null;
}

interface Project {
  id: string;
  name: string;
}

const EVENT_TYPES = [
  { value: "PROJECT", label: "프로젝트", color: "#8B5CF6" },
  { value: "CONTENT", label: "콘텐츠 업로드", color: "#3B82F6" },
  { value: "SETTLEMENT", label: "정산", color: "#F59E0B" },
  { value: "PAYMENT", label: "입금", color: "#10B981" },
  { value: "INVOICE", label: "세금계산서", color: "#EF4444" },
  { value: "MEETING", label: "미팅", color: "#EC4899" },
  { value: "DEADLINE", label: "마감", color: "#DC2626" },
  { value: "CUSTOM", label: "일반", color: "#6B7280" },
];

export default function CalendarPage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    date: "",
    endDate: "",
    type: "CUSTOM",
    color: "",
    memo: "",
    projectId: "",
  });

  // Handle Google Calendar connection status
  useEffect(() => {
    const googleStatus = searchParams.get("google");
    const error = searchParams.get("error");

    if (googleStatus === "connected") {
      toast({
        title: "Google Calendar 연결 성공",
        description: "이제 일정을 동기화할 수 있습니다.",
      });
      // Clean URL
      window.history.replaceState({}, "", "/calendar");
    } else if (error) {
      const errorMessages: Record<string, string> = {
        access_denied: "Google Calendar 접근이 거부되었습니다.",
        invalid_request: "잘못된 요청입니다.",
        token_error: "인증 토큰을 받지 못했습니다.",
        auth_failed: "인증에 실패했습니다.",
      };
      toast({
        title: "연결 실패",
        description: errorMessages[error] || "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/calendar");
    }
  }, [searchParams, toast]);

  useEffect(() => {
    fetchEvents();
    fetchProjects();
  }, [currentDate]);

  async function fetchEvents() {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      const res = await fetch(`/api/calendar?year=${year}&month=${month}`);
      const data = await res.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchProjects() {
    try {
      const res = await fetch("/api/projects?limit=100");
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    }
  }

  const monthName = currentDate.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
  });

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getEventsForDay = (day: number) => {
    const dateStr = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    ).toISOString().split("T")[0];

    return events.filter((event) => {
      const eventDate = new Date(event.date).toISOString().split("T")[0];
      return eventDate === dateStr;
    });
  };

  const getTypeColor = (type: string, color: string | null) => {
    if (color) return color;
    const found = EVENT_TYPES.find((t) => t.value === type);
    return found?.color || "#6B7280";
  };

  const getTypeLabel = (type: string) => {
    const found = EVENT_TYPES.find((t) => t.value === type);
    return found?.label || type;
  };

  const openNewEventDialog = (day?: number) => {
    const date = day
      ? new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      : new Date();
    
    setFormData({
      title: "",
      date: date.toISOString().split("T")[0],
      endDate: "",
      type: "CUSTOM",
      color: "",
      memo: "",
      projectId: "",
    });
    setSelectedEvent(null);
    setIsDialogOpen(true);
  };

  const openEditEventDialog = (event: CalendarEvent) => {
    setFormData({
      title: event.title,
      date: new Date(event.date).toISOString().split("T")[0],
      endDate: event.endDate ? new Date(event.endDate).toISOString().split("T")[0] : "",
      type: event.type,
      color: event.color || "",
      memo: event.memo || "",
      projectId: event.project?.id || "",
    });
    setSelectedEvent(event);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.date) return;

    setIsSubmitting(true);
    try {
      const url = selectedEvent
        ? `/api/calendar/${selectedEvent.id}`
        : "/api/calendar";
      const method = selectedEvent ? "PATCH" : "POST";

      const payload = {
        title: formData.title,
        date: formData.date,
        endDate: formData.endDate || null,
        type: formData.type,
        color: formData.color || null,
        memo: formData.memo || null,
        projectId: formData.projectId || null,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsDialogOpen(false);
        fetchEvents();
      }
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteDialog = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/calendar/${selectedEvent.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setIsDeleteDialogOpen(false);
        setIsDialogOpen(false);
        setSelectedEvent(null);
        fetchEvents();
      } else {
        alert("삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">캘린더</h1>
          <p className="text-muted-foreground mt-1">
            일정을 관리합니다.
          </p>
        </div>
        <Button onClick={() => openNewEventDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          일정 추가
        </Button>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{monthName}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentDate(new Date())}
              >
                오늘
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[600px] w-full" />
          ) : (
            <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden">
              {/* Week day headers */}
              {weekDays.map((day, i) => (
                <div
                  key={day}
                  className={`p-2 text-center text-sm font-medium bg-muted-foreground/10 ${
                    i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : ""
                  }`}
                >
                  {day}
                </div>
              ))}

              {/* Empty cells for days before first day of month */}
              {[...Array(firstDayOfMonth)].map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[120px] bg-background p-2" />
              ))}

              {/* Days of month */}
              {[...Array(daysInMonth)].map((_, i) => {
                const day = i + 1;
                const dayEvents = getEventsForDay(day);
                const isToday =
                  day === new Date().getDate() &&
                  currentDate.getMonth() === new Date().getMonth() &&
                  currentDate.getFullYear() === new Date().getFullYear();
                const dayOfWeek = (firstDayOfMonth + i) % 7;

                return (
                  <div
                    key={day}
                    className={`min-h-[120px] bg-background p-2 group cursor-pointer hover:bg-muted/50 transition-colors ${
                      isToday ? "ring-2 ring-primary ring-inset" : ""
                    }`}
                    onClick={() => openNewEventDialog(day)}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-medium ${
                          dayOfWeek === 0
                            ? "text-red-500"
                            : dayOfWeek === 6
                            ? "text-blue-500"
                            : ""
                        } ${isToday ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center" : ""}`}
                      >
                        {day}
                      </span>
                      <Plus className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="space-y-1 mt-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80"
                          style={{
                            backgroundColor: `${getTypeColor(event.type, event.color)}20`,
                            borderLeft: `3px solid ${getTypeColor(event.type, event.color)}`,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditEventDialog(event);
                          }}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-muted-foreground pl-1">
                          +{dayEvents.length - 3}개 더
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Types Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">일정 유형</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {EVENT_TYPES.map((type) => (
              <div key={type.value} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: type.color }}
                />
                <span className="text-sm text-muted-foreground">{type.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Google Calendar Sync */}
      <GoogleCalendarSync onSyncComplete={fetchEvents} />

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            이번 달 일정
          </CardTitle>
          <CardDescription>등록된 모든 일정</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-8">
              <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">이번 달 일정이 없습니다.</p>
              <Button variant="outline" className="mt-4" onClick={() => openNewEventDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                첫 일정 추가하기
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => openEditEventDialog(event)}
                >
                  <div
                    className="w-2 h-10 rounded-full"
                    style={{ backgroundColor: getTypeColor(event.type, event.color) }}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{event.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(event.date)}
                      {event.project && ` • ${event.project.name}`}
                    </p>
                  </div>
                  <Badge variant="outline">{getTypeLabel(event.type)}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedEvent ? "일정 수정" : "새 일정 추가"}
            </DialogTitle>
            <DialogDescription>
              일정 정보를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">제목 *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="일정 제목"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">시작일 *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">종료일</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>유형</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: type.color }}
                          />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>관련 프로젝트</Label>
                <Select
                  value={formData.projectId || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, projectId: value === "none" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="선택 안함" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">선택 안함</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="memo">메모</Label>
              <Textarea
                id="memo"
                value={formData.memo}
                onChange={(e) =>
                  setFormData({ ...formData, memo: e.target.value })
                }
                placeholder="일정에 대한 메모"
                rows={3}
              />
            </div>

            <div className="flex justify-between pt-4">
              {selectedEvent ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={openDeleteDialog}
                  disabled={isSubmitting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  삭제
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  취소
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {selectedEvent ? "수정" : "추가"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>일정 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{selectedEvent?.title}" 일정을 삭제하시겠습니까?
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
