"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  RefreshCw,
  Link2,
  Link2Off,
  ArrowDownToLine,
  ArrowUpFromLine,
  Loader2,
  CheckCircle2,
  XCircle,
  Calendar,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface GoogleCalendar {
  id: string;
  summary: string;
  primary: boolean;
  backgroundColor?: string;
}

interface SyncStatus {
  connected: boolean;
  calendarId: string;
  syncedEventsCount: number;
  autoSyncEnabled?: boolean;
}

interface GoogleCalendarSyncProps {
  onSyncComplete?: () => void;
}

export function GoogleCalendarSync({ onSyncComplete }: GoogleCalendarSyncProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncAction, setSyncAction] = useState<string | null>(null);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const [enablingAutoSync, setEnablingAutoSync] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      setLoading(true);
      const res = await fetch("/api/google/sync");
      const data = await res.json();

      if (data.error === "Google Calendar not configured") {
        setNotConfigured(true);
        return;
      }

      setStatus(data);

      if (data.connected) {
        fetchCalendars();
      }
    } catch (error) {
      console.error("Fetch status error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCalendars() {
    try {
      const res = await fetch("/api/google/calendars");
      const data = await res.json();

      if (data.calendars) {
        setCalendars(data.calendars);
      }
    } catch (error) {
      console.error("Fetch calendars error:", error);
    }
  }

  async function handleConnect() {
    try {
      const res = await fetch("/api/google/auth");
      const data = await res.json();

      if (data.error === "Google Calendar not configured") {
        setNotConfigured(true);
        toast({
          title: "설정 필요",
          description: "Google Calendar API가 설정되지 않았습니다. 관리자에게 문의하세요.",
          variant: "destructive",
        });
        return;
      }

      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error("Connect error:", error);
      toast({
        title: "연결 실패",
        description: "Google Calendar 연결에 실패했습니다.",
        variant: "destructive",
      });
    }
  }

  async function handleDisconnect() {
    try {
      const res = await fetch("/api/google/sync", { method: "DELETE" });
      
      if (res.ok) {
        setStatus({ connected: false, calendarId: "", syncedEventsCount: 0 });
        setCalendars([]);
        toast({
          title: "연결 해제됨",
          description: "Google Calendar 연결이 해제되었습니다.",
        });
      }
    } catch (error) {
      console.error("Disconnect error:", error);
      toast({
        title: "오류",
        description: "연결 해제에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setDisconnectOpen(false);
    }
  }

  async function handleSync(action: "push" | "pull" | "full") {
    try {
      setSyncing(true);
      setSyncAction(action);

      const res = await fetch("/api/google/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (data.success) {
        const { results } = data;
        toast({
          title: "동기화 완료",
          description: `푸시: ${results.pushed}건, 풀: ${results.pulled}건, 업데이트: ${results.updated}건`,
        });
        fetchStatus();
        onSyncComplete?.();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Sync error:", error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : "일정 동기화에 실패했습니다.";

      toast({
        title: "동기화 실패",
        description: message,
        variant: "destructive",
      });

      await fetchStatus();
    } finally {
      setSyncing(false);
      setSyncAction(null);
    }
  }

  async function handleCalendarChange(calendarId: string) {
    try {
      await fetch("/api/google/calendars", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendarId }),
      });

      setStatus((prev) => prev ? { ...prev, calendarId } : null);
      toast({
        title: "캘린더 변경됨",
        description: "동기화할 캘린더가 변경되었습니다.",
      });
    } catch (error) {
      console.error("Calendar change error:", error);
    }
  }

  async function handleEnableAutoSync() {
    try {
      setEnablingAutoSync(true);
      const res = await fetch("/api/google/sync", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: "자동 동기화 활성화",
          description: "Google Calendar 변경 시 자동으로 동기화됩니다.",
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error("Enable auto-sync error:", error);
      toast({
        title: "자동 동기화 실패",
        description: error.message || "자동 동기화 활성화에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setEnablingAutoSync(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">로딩 중...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (notConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-5 w-5" />
            Google Calendar 연동
          </CardTitle>
          <CardDescription>
            Google Calendar와 일정을 동기화합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <XCircle className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-sm font-medium">설정 필요</p>
              <p className="text-xs text-muted-foreground">
                Google OAuth 설정이 필요합니다. 환경변수에 GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET를 설정해주세요.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5" />
              Google Calendar 연동
            </CardTitle>
            <CardDescription>
              Google Calendar와 일정을 동기화합니다.
            </CardDescription>
          </div>
          {status?.connected && (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              연결됨
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status?.connected ? (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Google Calendar와 연결하면 ERP의 일정을 Google Calendar와 양방향으로 동기화할 수 있습니다.
              </p>
            </div>
            <Button onClick={handleConnect} className="w-full gap-2">
              <Link2 className="h-4 w-4" />
              Google Calendar 연결
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Calendar Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">동기화 대상 캘린더</label>
              <Select
                value={status.calendarId}
                onValueChange={handleCalendarChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="캘린더 선택" />
                </SelectTrigger>
                <SelectContent>
                  {calendars.map((cal) => (
                    <SelectItem key={cal.id} value={cal.id!}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cal.backgroundColor || "#4285f4" }}
                        />
                        {cal.summary}
                        {cal.primary && (
                          <Badge variant="secondary" className="text-[10px] ml-1">
                            기본
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sync Stats */}
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                <span className="text-muted-foreground">동기화된 일정:</span>{" "}
                <span className="font-medium">{status.syncedEventsCount}건</span>
              </p>
            </div>

            {/* Sync Actions */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSync("push")}
                disabled={syncing}
                className="gap-1"
              >
                {syncing && syncAction === "push" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ArrowUpFromLine className="h-3 w-3" />
                )}
                <span className="hidden sm:inline">ERP→구글</span>
                <span className="sm:hidden">푸시</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSync("pull")}
                disabled={syncing}
                className="gap-1"
              >
                {syncing && syncAction === "pull" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ArrowDownToLine className="h-3 w-3" />
                )}
                <span className="hidden sm:inline">구글→ERP</span>
                <span className="sm:hidden">풀</span>
              </Button>
              <Button
                size="sm"
                onClick={() => handleSync("full")}
                disabled={syncing}
                className="gap-1"
              >
                {syncing && syncAction === "full" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                전체
              </Button>
            </div>

            {/* Auto-sync */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleEnableAutoSync}
              disabled={enablingAutoSync}
              className="w-full gap-2"
            >
              {enablingAutoSync ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {enablingAutoSync ? "활성화 중..." : "자동 동기화 활성화"}
            </Button>

            {/* Disconnect */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDisconnectOpen(true)}
              className="w-full text-muted-foreground hover:text-destructive"
            >
              <Link2Off className="h-4 w-4 mr-2" />
              연결 해제
            </Button>
          </div>
        )}
      </CardContent>

      {/* Disconnect Confirmation */}
      <AlertDialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>연결 해제</AlertDialogTitle>
            <AlertDialogDescription>
              Google Calendar 연결을 해제하시겠습니까? 
              동기화된 일정의 연결 정보가 삭제되지만 일정 자체는 유지됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect}>
              연결 해제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

