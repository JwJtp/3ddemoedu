// Cross-platform setup helper (works on Windows, macOS, Linux).
import { copyFileSync, existsSync } from "node:fs";
if (!existsSync(".env.local")) {
  copyFileSync(".env.example", ".env.local");
  console.log("Created .env.local from .env.example (demo mode).");
} else {
  console.log(".env.local already exists, leaving it alone.");
}
