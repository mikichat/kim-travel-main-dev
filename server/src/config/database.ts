import { PrismaClient } from '@prisma/client';

// Prisma Client 인스턴스 생성
// 싱글톤 패턴으로 구현하여 불필요한 연결 방지
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// 데이터베이스 연결 테스트
export async function testConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// 데이터베이스 연결 종료
export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}

// 트랜잭션 헬퍼 타입
export type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export default prisma;
