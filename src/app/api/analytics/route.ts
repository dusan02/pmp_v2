import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

interface AnalyticsRequest {
  events: Array<{
    id: string;
    name: string;
    category: string;
    action: string;
    label?: string;
    value?: number;
    properties?: Record<string, any>;
    timestamp: number;
    sessionId: string;
    userId?: string;
    page: string;
    userAgent: string;
    referrer?: string;
  }>;
  session: {
    id: string;
    startTime: number;
    lastActivity: number;
    pageViews: number;
    events: number;
    duration: number;
    referrer?: string;
    userAgent: string;
    deviceInfo: {
      type: string;
      os: string;
      browser: string;
      screen: {
        width: number;
        height: number;
      };
    };
  };
  timestamp: number;
  offline?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyticsRequest = await request.json();
    const { events, session, offline } = body;

    // Validate request
    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'Invalid events data' },
        { status: 400 }
      );
    }

    // Process events in batches
    const batchSize = 50;
    const batches = [];
    for (let i = 0; i < events.length; i += batchSize) {
      batches.push(events.slice(i, i + batchSize));
    }

    // Process each batch
    for (const batch of batches) {
      await processAnalyticsBatch(batch, session, offline);
    }

    // Update session data
    await updateSessionData(session);

    // Update real-time analytics
    await updateRealTimeAnalytics(events, session);

    return NextResponse.json({ 
      success: true, 
      processed: events.length,
      offline: offline || false
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function processAnalyticsBatch(
  events: AnalyticsRequest['events'],
  session: AnalyticsRequest['session'],
  offline?: boolean
) {
  const analyticsData = events.map(event => ({
    eventId: event.id,
    name: event.name,
    category: event.category,
    action: event.action,
    label: event.label,
    value: event.value,
    properties: event.properties ? JSON.stringify(event.properties) : null,
    timestamp: new Date(event.timestamp),
    sessionId: event.sessionId,
    userId: event.userId,
    page: event.page,
    userAgent: event.userAgent,
    referrer: event.referrer,
    offline: offline || false,
    createdAt: new Date()
  }));

  // Store in database
  await prisma.analyticsEvent.createMany({
    data: analyticsData,
    skipDuplicates: true
  });

  // Store in Redis for real-time access
  for (const event of events) {
    const key = `analytics:event:${event.id}`;
    await redis.setex(key, 3600, JSON.stringify(event)); // 1 hour TTL
  }
}

async function updateSessionData(session: AnalyticsRequest['session']) {
  const sessionData = {
    sessionId: session.id,
    startTime: new Date(session.startTime),
    lastActivity: new Date(session.lastActivity),
    pageViews: session.pageViews,
    events: session.events,
    duration: session.duration,
    referrer: session.referrer,
    userAgent: session.userAgent,
    deviceType: session.deviceInfo.type,
    deviceOs: session.deviceInfo.os,
    deviceBrowser: session.deviceInfo.browser,
    screenWidth: session.deviceInfo.screen.width,
    screenHeight: session.deviceInfo.screen.height,
    updatedAt: new Date()
  };

  // Upsert session data
  await prisma.analyticsSession.upsert({
    where: { sessionId: session.id },
    update: sessionData,
    create: {
      ...sessionData,
      createdAt: new Date()
    }
  });
}

async function updateRealTimeAnalytics(
  events: AnalyticsRequest['events'],
  session: AnalyticsRequest['session']
) {
  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];

  // Update daily stats
  const dailyKey = `analytics:daily:${today}`;
  const dailyStats = await redis.hgetall(dailyKey);

  let totalEvents = parseInt(dailyStats.totalEvents || '0');
  let totalSessions = parseInt(dailyStats.totalSessions || '0');
  let totalPageViews = parseInt(dailyStats.totalPageViews || '0');

  totalEvents += events.length;
  totalPageViews += session.pageViews;

  // Check if this is a new session for today
  const sessionKey = `analytics:session:${session.id}`;
  const sessionExists = await redis.exists(sessionKey);
  if (!sessionExists) {
    totalSessions++;
    await redis.setex(sessionKey, 86400, '1'); // 24 hours
  }

  // Update daily stats
  await redis.hset(dailyKey, {
    totalEvents: totalEvents.toString(),
    totalSessions: totalSessions.toString(),
    totalPageViews: totalPageViews.toString(),
    lastUpdated: now.toString()
  });
  await redis.expire(dailyKey, 86400); // 24 hours

  // Update category stats
  for (const event of events) {
    const categoryKey = `analytics:category:${event.category}:${today}`;
    await redis.hincrby(categoryKey, 'count', 1);
    await redis.expire(categoryKey, 86400);
  }

  // Update page stats
  for (const event of events) {
    if (event.category === 'user' && event.action === 'page_view') {
      const pageKey = `analytics:page:${event.page}:${today}`;
      await redis.hincrby(pageKey, 'views', 1);
      await redis.expire(pageKey, 86400);
    }
  }

  // Update device stats
  const deviceKey = `analytics:device:${session.deviceInfo.type}:${today}`;
  await redis.hincrby(deviceKey, 'sessions', 1);
  await redis.expire(deviceKey, 86400);

  // Update browser stats
  const browserKey = `analytics:browser:${session.deviceInfo.browser}:${today}`;
  await redis.hincrby(browserKey, 'sessions', 1);
  await redis.expire(browserKey, 86400);
}

// GET endpoint for analytics data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const limit = parseInt(searchParams.get('limit') || '100');

    switch (type) {
      case 'daily':
        return await getDailyStats(date);
      case 'events':
        return await getRecentEvents(limit);
      case 'sessions':
        return await getRecentSessions(limit);
      case 'realtime':
        return await getRealTimeStats();
      default:
        return NextResponse.json(
          { error: 'Invalid type parameter' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Analytics GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getDailyStats(date: string) {
  const dailyKey = `analytics:daily:${date}`;
  const stats = await redis.hgetall(dailyKey);

  return NextResponse.json({
    date,
    totalEvents: parseInt(stats.totalEvents || '0'),
    totalSessions: parseInt(stats.totalSessions || '0'),
    totalPageViews: parseInt(stats.totalPageViews || '0'),
    lastUpdated: parseInt(stats.lastUpdated || '0')
  });
}

async function getRecentEvents(limit: number) {
  const events = await prisma.analyticsEvent.findMany({
    take: limit,
    orderBy: { timestamp: 'desc' },
    select: {
      id: true,
      name: true,
      category: true,
      action: true,
      label: true,
      value: true,
      timestamp: true,
      page: true,
      userAgent: true
    }
  });

  return NextResponse.json({ events });
}

async function getRecentSessions(limit: number) {
  const sessions = await prisma.analyticsSession.findMany({
    take: limit,
    orderBy: { lastActivity: 'desc' },
    select: {
      sessionId: true,
      startTime: true,
      lastActivity: true,
      pageViews: true,
      events: true,
      duration: true,
      deviceType: true,
      deviceBrowser: true
    }
  });

  return NextResponse.json({ sessions });
}

async function getRealTimeStats() {
  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];

  // Get today's stats
  const dailyKey = `analytics:daily:${today}`;
  const dailyStats = await redis.hgetall(dailyKey);

  // Get active sessions (last 5 minutes)
  const activeSessions = await prisma.analyticsSession.count({
    where: {
      lastActivity: {
        gte: new Date(now - 5 * 60 * 1000) // 5 minutes ago
      }
    }
  });

  return NextResponse.json({
    today: {
      totalEvents: parseInt(dailyStats.totalEvents || '0'),
      totalSessions: parseInt(dailyStats.totalSessions || '0'),
      totalPageViews: parseInt(dailyStats.totalPageViews || '0')
    },
    realtime: {
      activeSessions,
      timestamp: now
    }
  });
} 