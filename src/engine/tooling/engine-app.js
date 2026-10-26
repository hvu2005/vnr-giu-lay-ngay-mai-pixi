
import { execSync } from "child_process";


execSync("node src/engine/tooling/auto-assets.js", { stdio: "inherit" });