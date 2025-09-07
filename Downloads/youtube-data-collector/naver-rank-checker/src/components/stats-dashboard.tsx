'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EnrichedYouTubeVideo } from '@/types/youtube';
import { 
  TrendingUp, 
  Users, 
  PlayCircle, 
  Heart, 
  MessageSquare, 
  Clock, 
  Calendar,
  BarChart3,
  PieChart
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { useMemo } from 'react';

interface StatsDashboardProps {
  results: EnrichedYouTubeVideo[];
}

export function StatsDashboard({ results }: StatsDashboardProps) {
  const stats = useMemo(() => {
    if (!results || results.length === 0) {
      return null;
    }

    const totalVideos = results.length;
    const totalViews = results.reduce((sum, video) => {
      const views = parseInt(video.statistics?.viewCount || '0');
      return sum + views;
    }, 0);
    
    const totalLikes = results.reduce((sum, video) => {
      const likes = parseInt(video.statistics?.likeCount || '0');
      return sum + likes;
    }, 0);
    
    const totalComments = results.reduce((sum, video) => {
      const comments = parseInt(video.statistics?.commentCount || '0');
      return sum + comments;
    }, 0);

    const avgViews = Math.floor(totalViews / totalVideos);
    const avgLikes = Math.floor(totalLikes / totalVideos);
    const avgComments = Math.floor(totalComments / totalVideos);

    // 쇼츠 비율
    const shortsCount = results.filter(video => video.isShort).length;
    const shortsRatio = (shortsCount / totalVideos * 100).toFixed(1);

    // 채널별 분석
    const channelStats = results.reduce((acc, video) => {
      const channel = video.snippet.channelTitle;
      if (!acc[channel]) {
        acc[channel] = { count: 0, views: 0, likes: 0 };
      }
      acc[channel].count += 1;
      acc[channel].views += parseInt(video.statistics?.viewCount || '0');
      acc[channel].likes += parseInt(video.statistics?.likeCount || '0');
      return acc;
    }, {} as Record<string, { count: number; views: number; likes: number }>);

    const topChannels = Object.entries(channelStats)
      .map(([name, stats]) => ({
        name,
        동영상수: stats.count,
        총조회수: stats.views,
        총좋아요: stats.likes,
        평균조회수: Math.floor(stats.views / stats.count)
      }))
      .sort((a, b) => b.총조회수 - a.총조회수)
      .slice(0, 5);

    // 조회수 분포
    const viewRanges = [
      { range: '1K 미만', min: 0, max: 1000, color: '#ef4444' },
      { range: '1K-10K', min: 1000, max: 10000, color: '#f97316' },
      { range: '10K-100K', min: 10000, max: 100000, color: '#eab308' },
      { range: '100K-1M', min: 100000, max: 1000000, color: '#22c55e' },
      { range: '1M+', min: 1000000, max: Infinity, color: '#3b82f6' }
    ];

    const viewDistribution = viewRanges.map(({ range, min, max, color }) => {
      const count = results.filter(video => {
        const views = parseInt(video.statistics?.viewCount || '0');
        return views >= min && views < max;
      }).length;
      
      return {
        range,
        count,
        percentage: (count / totalVideos * 100).toFixed(1),
        color
      };
    }).filter(item => item.count > 0);

    // 업로드 시간 패턴 (월별)
    const monthlyData = results.reduce((acc, video) => {
      if (!video.snippet.publishedAt) return acc;
      
      const date = new Date(video.snippet.publishedAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthKey, count: 0, views: 0 };
      }
      acc[monthKey].count += 1;
      acc[monthKey].views += parseInt(video.statistics?.viewCount || '0');
      
      return acc;
    }, {} as Record<string, { month: string; count: number; views: number }>);

    const monthlyStats = Object.values(monthlyData)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // 최근 12개월

    return {
      overview: {
        totalVideos,
        totalViews,
        totalLikes,
        totalComments,
        avgViews,
        avgLikes,
        avgComments,
        shortsCount,
        shortsRatio
      },
      topChannels,
      viewDistribution,
      monthlyStats
    };
  }, [results]);

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            분석할 데이터가 없습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 개요 통계 */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            전체 통계 개요
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <PlayCircle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">{stats.overview.totalVideos}</div>
              <div className="text-sm text-gray-600">총 동영상</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">{formatNumber(stats.overview.totalViews)}</div>
              <div className="text-sm text-gray-600">총 조회수</div>
              <div className="text-xs text-gray-500">평균: {formatNumber(stats.overview.avgViews)}</div>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <Heart className="h-8 w-8 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-600">{formatNumber(stats.overview.totalLikes)}</div>
              <div className="text-sm text-gray-600">총 좋아요</div>
              <div className="text-xs text-gray-500">평균: {formatNumber(stats.overview.avgLikes)}</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <MessageSquare className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600">{formatNumber(stats.overview.totalComments)}</div>
              <div className="text-sm text-gray-600">총 댓글</div>
              <div className="text-xs text-gray-500">평균: {formatNumber(stats.overview.avgComments)}</div>
            </div>
          </div>
          
          <div className="flex justify-center gap-4 mt-4">
            <Badge variant="secondary" className="px-3 py-1">
              YouTube Shorts: {stats.overview.shortsCount}개 ({stats.overview.shortsRatio}%)
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              일반 동영상: {stats.overview.totalVideos - stats.overview.shortsCount}개
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* 상위 채널 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            상위 채널 (조회수 기준)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.topChannels.map((channel, index) => (
              <div key={channel.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{channel.name}</div>
                  <div className="text-xs text-gray-500">
                    {channel.동영상수}개 동영상 • 평균 {formatNumber(channel.평균조회수)} 조회수
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm">{formatNumber(channel.총조회수)}</div>
                  <div className="text-xs text-gray-500">{formatNumber(channel.총좋아요)} 좋아요</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 조회수 분포 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            조회수 분포
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.viewDistribution.map((item) => (
              <div key={item.range} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm">{item.range}</span>
                </div>
                <div className="text-right">
                  <span className="font-medium">{item.count}개</span>
                  <span className="text-xs text-gray-500 ml-1">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 월별 업로드 추이 */}
      {stats.monthlyStats.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              월별 업로드 추이
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.monthlyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    fontSize={12}
                    tickFormatter={(value) => {
                      const [year, month] = value.split('-');
                      return `${year}-${month}`;
                    }}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip 
                    labelFormatter={(value) => `${value}월`}
                    formatter={[(value: number) => [value, '동영상 수']]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}