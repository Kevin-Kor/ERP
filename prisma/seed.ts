import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 12);
  
  const admin = await prisma.user.upsert({
    where: { email: "admin@agency.com" },
    update: {},
    create: {
      email: "admin@agency.com",
      password: hashedPassword,
      name: "관리자",
      role: "ADMIN",
    },
  });

  console.log("✅ Admin user created:", admin.email);

  // Create member user
  const memberPassword = await bcrypt.hash("member123", 12);
  
  const member = await prisma.user.upsert({
    where: { email: "member@agency.com" },
    update: {},
    create: {
      email: "member@agency.com",
      password: memberPassword,
      name: "팀원",
      role: "MEMBER",
    },
  });

  console.log("✅ Member user created:", member.email);

  // 현재 날짜 기준 설정
  const today = new Date();
  const thisYear = today.getFullYear();
  const thisMonth = today.getMonth();
  
  // 이번 달 시작일
  const startOfThisMonth = new Date(thisYear, thisMonth, 1);
  
  // Create sample clients
  const client1 = await prisma.client.create({
    data: {
      name: "A베이커리",
      contactName: "김베이커",
      phone: "02-1234-5678",
      email: "contact@abakery.com",
      businessNo: "123-45-67890",
      address: "서울시 강남구 역삼동 123-45",
      industry: "FOOD",
      status: "ACTIVE",
      memo: "단골 클라이언트, 매달 정기 캠페인 진행",
    },
  });

  const client2 = await prisma.client.create({
    data: {
      name: "B화장품",
      contactName: "이뷰티",
      phone: "02-9876-5432",
      email: "marketing@bcosmetics.com",
      businessNo: "234-56-78901",
      address: "서울시 성동구 성수동 456-78",
      industry: "BEAUTY",
      status: "ACTIVE",
      memo: "프리미엄 라인 캠페인 위주",
    },
  });

  console.log("✅ Sample clients created");

  // Create sample influencers
  const influencer1 = await prisma.influencer.create({
    data: {
      name: "김푸디",
      instagramId: "@food_kim",
      youtubeChannel: "https://youtube.com/@foodkim",
      followerCount: 125000,
      categories: "FOOD,LIFESTYLE",
      phone: "010-1111-2222",
      bankAccount: "국민은행 123-456-789012",
      priceRange: "피드 30만, 릴스 50만",
      memo: "성실하고 퀄리티 높음. 음식 사진 특히 잘 찍음",
    },
  });

  const influencer2 = await prisma.influencer.create({
    data: {
      name: "이뷰티",
      instagramId: "@beauty_lee",
      followerCount: 85000,
      categories: "BEAUTY,FASHION",
      phone: "010-3333-4444",
      bankAccount: "신한은행 987-654-321098",
      priceRange: "피드 25만, 릴스 40만",
      memo: "뷰티 제품 리뷰 전문",
    },
  });

  console.log("✅ Sample influencers created");

  // Create sample projects (이번 달 기준)
  const project1 = await prisma.project.create({
    data: {
      name: "A베이커리 12월 숏폼 캠페인",
      clientId: client1.id,
      managerId: admin.id,
      status: "IN_PROGRESS",
      startDate: new Date(thisYear, thisMonth, 1),
      endDate: new Date(thisYear, thisMonth, 25),
      contractAmount: 3000000, // 300만원
      platforms: "INSTAGRAM_REELS,YOUTUBE_SHORTS,TIKTOK",
      contentTypes: "SHORTFORM",
      memo: "신메뉴 홍보 숏폼 3편 제작",
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: "B화장품 12월 릴스 캠페인",
      clientId: client2.id,
      managerId: admin.id,
      status: "IN_PROGRESS",
      startDate: new Date(thisYear, thisMonth, 5),
      endDate: new Date(thisYear, thisMonth, 20),
      contractAmount: 2000000, // 200만원
      platforms: "INSTAGRAM_REELS",
      contentTypes: "SHORTFORM",
      memo: "겨울 스킨케어 릴스 2편",
    },
  });

  console.log("✅ Sample projects created");

  // Create project-influencer assignments
  const pi1 = await prisma.projectInfluencer.create({
    data: {
      projectId: project1.id,
      influencerId: influencer1.id,
      fee: 500000, // 50만원
      paymentStatus: "PENDING",
      paymentDueDate: new Date(thisYear, thisMonth, 28),
    },
  });

  const pi2 = await prisma.projectInfluencer.create({
    data: {
      projectId: project2.id,
      influencerId: influencer2.id,
      fee: 400000, // 40만원
      paymentStatus: "PENDING",
      paymentDueDate: new Date(thisYear, thisMonth, 25),
    },
  });

  console.log("✅ Project-influencer assignments created");

  // Create transactions (이번 달 기준 - 대시보드와 재무에 동일하게 표시됨)
  // 수익 거래
  await prisma.transaction.create({
    data: {
      date: new Date(thisYear, thisMonth, 1),
      type: "REVENUE",
      category: "CAMPAIGN_FEE",
      amount: 3000000,
      paymentStatus: "COMPLETED",
      paymentDate: new Date(thisYear, thisMonth, 5),
      clientId: client1.id,
      projectId: project1.id,
      memo: "A베이커리 12월 캠페인 대행료 (입금완료)",
    },
  });

  await prisma.transaction.create({
    data: {
      date: new Date(thisYear, thisMonth, 5),
      type: "REVENUE",
      category: "CAMPAIGN_FEE",
      amount: 2000000,
      paymentStatus: "PENDING",
      clientId: client2.id,
      projectId: project2.id,
      memo: "B화장품 12월 캠페인 대행료 (미수금)",
    },
  });

  // 비용 거래
  await prisma.transaction.create({
    data: {
      date: new Date(thisYear, thisMonth, 10),
      type: "EXPENSE",
      category: "OPERATIONS",
      amount: 300000,
      paymentStatus: "COMPLETED",
      paymentDate: new Date(thisYear, thisMonth, 10),
      memo: "사무실 임대료",
    },
  });

  await prisma.transaction.create({
    data: {
      date: new Date(thisYear, thisMonth, 12),
      type: "EXPENSE",
      category: "FOOD",
      amount: 150000,
      paymentStatus: "COMPLETED",
      paymentDate: new Date(thisYear, thisMonth, 12),
      memo: "12월 식비",
    },
  });

  await prisma.transaction.create({
    data: {
      date: new Date(thisYear, thisMonth, 15),
      type: "EXPENSE",
      category: "SUBSCRIPTION",
      amount: 50000,
      paymentStatus: "COMPLETED",
      paymentDate: new Date(thisYear, thisMonth, 15),
      memo: "편집 프로그램 구독료",
    },
  });

  console.log("✅ Sample transactions created");

  // 이번 달 요약:
  // 총 매출: 5,000,000원 (300만 + 200만)
  // 총 비용: 500,000원 (30만 + 15만 + 5만)
  // 순이익: 4,500,000원
  // 미수금: 2,000,000원 (B화장품)
  // 인플루언서 미정산: 900,000원 (50만 + 40만)

  // Create sample documents
  await prisma.document.create({
    data: {
      type: "QUOTE",
      docNumber: `EST-${thisYear}${String(thisMonth + 1).padStart(2, "0")}-001`,
      issueDate: new Date(thisYear, thisMonth, 1),
      amount: 3000000,
      status: "ACCEPTED",
      clientId: client1.id,
      projectId: project1.id,
      memo: "A베이커리 12월 캠페인 견적서",
    },
  });

  await prisma.document.create({
    data: {
      type: "QUOTE",
      docNumber: `EST-${thisYear}${String(thisMonth + 1).padStart(2, "0")}-002`,
      issueDate: new Date(thisYear, thisMonth, 5),
      amount: 2000000,
      status: "ACCEPTED",
      clientId: client2.id,
      projectId: project2.id,
      memo: "B화장품 12월 캠페인 견적서",
    },
  });

  console.log("✅ Sample documents created");

  // Create sample calendar events
  await prisma.calendarEvent.create({
    data: {
      title: "A베이커리 캠페인 종료",
      date: new Date(thisYear, thisMonth, 25),
      type: "PROJECT",
      color: "#8B5CF6",
      projectId: project1.id,
    },
  });

  await prisma.calendarEvent.create({
    data: {
      title: "B화장품 캠페인 종료",
      date: new Date(thisYear, thisMonth, 20),
      type: "PROJECT",
      color: "#8B5CF6",
      projectId: project2.id,
    },
  });

  await prisma.calendarEvent.create({
    data: {
      title: "김푸디 정산 예정",
      date: new Date(thisYear, thisMonth, 28),
      type: "SETTLEMENT",
      color: "#F59E0B",
      projectId: project1.id,
    },
  });

  console.log("✅ Sample calendar events created");

  console.log("");
  console.log("📊 이번 달 데이터 요약:");
  console.log("================================");
  console.log("총 매출: ₩5,000,000");
  console.log("  - A베이커리: ₩3,000,000 (입금완료)");
  console.log("  - B화장품: ₩2,000,000 (미수금)");
  console.log("총 비용: ₩500,000");
  console.log("  - 사무실 임대료: ₩300,000");
  console.log("  - 식비: ₩150,000");
  console.log("  - 구독료: ₩50,000");
  console.log("순이익: ₩4,500,000 (90%)");
  console.log("================================");
  console.log("미수금: ₩2,000,000 (1건)");
  console.log("인플루언서 미정산: ₩900,000 (2건)");
  console.log("================================");
  console.log("");
  console.log("🎉 Seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
