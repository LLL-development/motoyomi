-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ShippingShop" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "rules" TEXT NOT NULL DEFAULT '{"v":1,"rules":[]}',
    "zoneChunks" TEXT NOT NULL DEFAULT '[]',
    "plan" TEXT NOT NULL DEFAULT 'free',
    "draft" TEXT NOT NULL DEFAULT '{}',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "appliedRevision" INTEGER NOT NULL DEFAULT 0,
    "customizationId" TEXT,
    "appliedAt" DATETIME,
    "applyLeaseUntil" DATETIME,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ShippingShop" ("plan", "rules", "shop", "updatedAt", "zoneChunks") SELECT "plan", "rules", "shop", "updatedAt", "zoneChunks" FROM "ShippingShop";
DROP TABLE "ShippingShop";
ALTER TABLE "new_ShippingShop" RENAME TO "ShippingShop";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
