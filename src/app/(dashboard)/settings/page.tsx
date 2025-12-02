"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Shield, Bell, Database } from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">설정</h1>
        <p className="text-muted-foreground mt-1">
          시스템 설정을 관리합니다.
        </p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            프로필 설정
          </CardTitle>
          <CardDescription>계정 정보를 관리합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>이름</Label>
              <Input defaultValue={session?.user?.name || ""} />
            </div>
            <div className="space-y-2">
              <Label>이메일</Label>
              <Input defaultValue={session?.user?.email || ""} disabled />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label>권한</Label>
            <Badge variant={session?.user?.role === "ADMIN" ? "default" : "secondary"}>
              {session?.user?.role === "ADMIN" ? "관리자" : "팀원"}
            </Badge>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>비밀번호 변경</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input type="password" placeholder="현재 비밀번호" />
              <Input type="password" placeholder="새 비밀번호" />
            </div>
          </div>
          <Button>저장</Button>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            알림 설정
          </CardTitle>
          <CardDescription>알림 수신 방법을 설정합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">정산 알림</p>
              <p className="text-sm text-muted-foreground">
                정산 예정일 전 알림을 받습니다.
              </p>
            </div>
            <Button variant="outline" size="sm">활성화</Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">미수금 알림</p>
              <p className="text-sm text-muted-foreground">
                미수금 발생 시 알림을 받습니다.
              </p>
            </div>
            <Button variant="outline" size="sm">활성화</Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">캠페인 마감 알림</p>
              <p className="text-sm text-muted-foreground">
                캠페인 마감일 전 알림을 받습니다.
              </p>
            </div>
            <Button variant="outline" size="sm">활성화</Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            보안 설정
          </CardTitle>
          <CardDescription>계정 보안을 관리합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">2단계 인증</p>
              <p className="text-sm text-muted-foreground">
                로그인 시 추가 인증을 요구합니다.
              </p>
            </div>
            <Badge variant="outline">미설정</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">로그인 기록</p>
              <p className="text-sm text-muted-foreground">
                최근 로그인 활동을 확인합니다.
              </p>
            </div>
            <Button variant="outline" size="sm">보기</Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Settings (Admin Only) */}
      {session?.user?.role === "ADMIN" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              데이터 관리
            </CardTitle>
            <CardDescription>데이터 백업 및 관리 (관리자 전용)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">데이터 백업</p>
                <p className="text-sm text-muted-foreground">
                  전체 데이터를 백업합니다.
                </p>
              </div>
              <Button variant="outline" size="sm">백업 생성</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">데이터 내보내기</p>
                <p className="text-sm text-muted-foreground">
                  데이터를 Excel 형식으로 내보냅니다.
                </p>
              </div>
              <Button variant="outline" size="sm">내보내기</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


