-- CreateTable
CREATE TABLE "ShippingShop" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "rules" TEXT NOT NULL DEFAULT '{"v":1,"rules":[]}',
    "zoneChunks" TEXT NOT NULL DEFAULT '[]',
    "plan" TEXT NOT NULL DEFAULT 'free',
    "updatedAt" DATETIME NOT NULL
);
