import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 기본 이미지 카테고리 시드 데이터
const defaultImageCategories = [
  { name: '호텔', description: '호텔 및 숙소 이미지', sortOrder: 1 },
  { name: '관광지', description: '관광지 및 명소 이미지', sortOrder: 2 },
  { name: '레스토랑', description: '레스토랑 및 식당 이미지', sortOrder: 3 },
  { name: '교통', description: '교통수단 및 이동 관련 이미지', sortOrder: 4 },
  { name: '기타', description: '기타 분류 이미지', sortOrder: 99 },
];

async function main() {
  console.log('Start seeding...');

  // 기본 이미지 카테고리 생성 (시스템 기본 - userId: null)
  for (const category of defaultImageCategories) {
    const existingCategory = await prisma.imageCategory.findFirst({
      where: {
        name: category.name,
        userId: null, // 시스템 기본 카테고리
      },
    });

    if (!existingCategory) {
      const created = await prisma.imageCategory.create({
        data: {
          name: category.name,
          description: category.description,
          sortOrder: category.sortOrder,
          userId: null, // 시스템 기본 카테고리는 userId가 null
        },
      });
      console.log(`Created image category: ${created.name}`);
    } else {
      console.log(`Image category already exists: ${category.name}`);
    }
  }

  console.log('Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
