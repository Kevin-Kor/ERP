export interface YouTubeSearchParams {
  query: string;
  maxResults?: number;
  region?: 'KR' | 'US' | 'JP' | 'GB' | '';
  publishedAfter?: string;
  publishedBefore?: string;
  videoDuration?: 'any' | 'short' | 'medium' | 'long';
  videoType?: 'any' | 'episode' | 'movie';
  order?: 'relevance' | 'date' | 'rating' | 'viewCount' | 'title';
  safeSearch?: 'none' | 'moderate' | 'strict';
  videoDefinition?: 'any' | 'high' | 'standard';
  videoDimension?: 'any' | '2d' | '3d';
  minViewCount?: number;
}

export interface YouTubeVideoSnippet {
  publishedAt: string;
  channelId: string;
  title: string;
  description: string;
  thumbnails: {
    default: YouTubeThumbnail;
    medium: YouTubeThumbnail;
    high: YouTubeThumbnail;
    standard?: YouTubeThumbnail;
    maxres?: YouTubeThumbnail;
  };
  channelTitle: string;
  tags?: string[];
  categoryId: string;
  liveBroadcastContent: 'none' | 'upcoming' | 'live';
  defaultLanguage?: string;
  localized?: {
    title: string;
    description: string;
  };
}

export interface YouTubeThumbnail {
  url: string;
  width: number;
  height: number;
}

export interface YouTubeVideoStatistics {
  viewCount: string;
  likeCount?: string;
  dislikeCount?: string;
  favoriteCount?: string;
  commentCount?: string;
}

export interface YouTubeVideoContentDetails {
  duration: string;
  dimension: '2d' | '3d';
  definition: 'hd' | 'sd';
  caption: 'true' | 'false';
  licensedContent: boolean;
  regionRestriction?: {
    allowed?: string[];
    blocked?: string[];
  };
  contentRating?: {
    acbRating?: string;
    agcomRating?: string;
    anatelRating?: string;
    bbfcRating?: string;
    bfvcRating?: string;
    bmukkRating?: string;
    catvRating?: string;
    catvfrRating?: string;
    cbfcRating?: string;
    cccRating?: string;
    cceRating?: string;
    chfilmRating?: string;
    chvrsRating?: string;
    cicfRating?: string;
    cnaRating?: string;
    cncRating?: string;
    csaRating?: string;
    cscfRating?: string;
    czfilmRating?: string;
    djctqRating?: string;
    djctqRatingReasons?: string[];
    ecbmctRating?: string;
    eefilmRating?: string;
    egfilmRating?: string;
    eirinRating?: string;
    fcbmRating?: string;
    fcoRating?: string;
    fmocRating?: string;
    fpbRating?: string;
    fpbRatingReasons?: string[];
    fskRating?: string;
    grfilmRating?: string;
    icaaRating?: string;
    ifcoRating?: string;
    ilfilmRating?: string;
    incaaRating?: string;
    kfcbRating?: string;
    kijkwijzerRating?: string;
    kmrbRating?: string;
    lsfRating?: string;
    mccaaRating?: string;
    mccypRating?: string;
    mcstRating?: string;
    mdaRating?: string;
    medietilsynetRating?: string;
    mekuRating?: string;
    mibacRating?: string;
    mocRating?: string;
    moctwRating?: string;
    mpaaRating?: string;
    mpaatRating?: string;
    mtrcbRating?: string;
    nbcRating?: string;
    nbcplRating?: string;
    nfrcRating?: string;
    nfvcbRating?: string;
    nkclvRating?: string;
    oflcRating?: string;
    pefilmRating?: string;
    rcnofRating?: string;
    resorteviolenciaRating?: string;
    rtcRating?: string;
    rteRating?: string;
    russiaRating?: string;
    skfilmRating?: string;
    smaisRating?: string;
    smsaRating?: string;
    tvpgRating?: string;
    ytRating?: string;
  };
  projection: 'rectangular' | '360';
}

export interface YouTubeVideo {
  kind: 'youtube#video';
  etag: string;
  id: string;
  snippet: YouTubeVideoSnippet;
  statistics: YouTubeVideoStatistics;
  contentDetails: YouTubeVideoContentDetails;
}

export interface YouTubeSearchResultItem {
  kind: 'youtube#searchResult';
  etag: string;
  id: {
    kind: 'youtube#video' | 'youtube#channel' | 'youtube#playlist';
    videoId?: string;
    channelId?: string;
    playlistId?: string;
  };
  snippet: YouTubeVideoSnippet;
}

export interface YouTubeSearchResponse {
  kind: 'youtube#searchListResponse';
  etag: string;
  nextPageToken?: string;
  prevPageToken?: string;
  regionCode: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: YouTubeSearchResultItem[];
}

export interface YouTubeVideosResponse {
  kind: 'youtube#videoListResponse';
  etag: string;
  items: YouTubeVideo[];
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}

export interface YouTubeChannel {
  kind: 'youtube#channel';
  etag: string;
  id: string;
  snippet: {
    title: string;
    description: string;
    customUrl?: string;
    publishedAt: string;
    thumbnails: {
      default: YouTubeThumbnail;
      medium: YouTubeThumbnail;
      high: YouTubeThumbnail;
    };
    localized: {
      title: string;
      description: string;
    };
    country?: string;
  };
  statistics: {
    viewCount: string;
    subscriberCount: string;
    hiddenSubscriberCount: boolean;
    videoCount: string;
  };
}

export interface YouTubeChannelsResponse {
  kind: 'youtube#channelListResponse';
  etag: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: YouTubeChannel[];
}

export interface EnrichedYouTubeVideo extends YouTubeVideo {
  channelInfo?: YouTubeChannel;
  formattedDuration?: string;
  formattedViewCount?: string;
  formattedLikeCount?: string;
  formattedCommentCount?: string;
  formattedPublishedAt?: string;
  thumbnailUrl?: string;
  videoUrl: string;
  channelUrl?: string;
  isShort?: boolean;
}

export interface YouTubeApiError {
  error: {
    code: number;
    message: string;
    errors: Array<{
      message: string;
      domain: string;
      reason: string;
      location?: string;
      locationType?: string;
    }>;
  };
}

export interface YouTubeSearchFormData {
  query: string;
  maxResults: number;
  region: 'KR' | 'US' | 'JP' | 'GB' | '';
  publishedAfter?: string;
  publishedBefore?: string;
  videoDuration: 'any' | 'short' | 'medium' | 'long';
  minViewCount?: number;
  videoType: 'any' | 'episode' | 'movie';
  order: 'relevance' | 'date' | 'rating' | 'viewCount' | 'title';
}

export interface YouTubeStatsData {
  totalVideos: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  avgViews: number;
  avgLikes: number;
  avgComments: number;
  topChannels: Array<{
    channelTitle: string;
    videoCount: number;
    totalViews: number;
  }>;
  durationDistribution: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  viewsDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
}