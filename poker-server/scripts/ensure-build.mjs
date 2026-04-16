import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/** Package root (`poker-server/`), one level above `scripts/`. */
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const serverJs = join(root, "dist", "server.js");

if (!existsSync(serverJs)) {
  const result = spawnSync("npm", ["run", "build"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });
  process.exit(result.status ?? 1);
}
