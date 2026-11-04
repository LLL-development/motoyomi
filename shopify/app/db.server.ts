import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient;
}

if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL || "file:dev.sqlite" });
  }
}

const prisma = global.prismaGlobal ?? new PrismaClient({ datasourceUrl: process.env.DATABASE_URL || "file:dev.sqlite" });

export default prisma;
