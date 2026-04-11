import path from 'path';
import type { PrismaConfig } from 'prisma';

const config: PrismaConfig = {
  earlyAccess: [],
  seed: {
    command: 'npx ts-node prisma/seed.ts',
    cwd: path.resolve(__dirname, '..'),
  },
};

export default config;
