-- Add username and passwordHash columns with temporary defaults to handle existing rows
ALTER TABLE "User" ADD COLUMN "username" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '';

-- Remove the defaults so future rows must supply values
ALTER TABLE "User" ALTER COLUMN "username" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP DEFAULT;

-- Add unique constraint on username
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
