import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

export default defineManifest({
  manifest_version: 3,
  name: "Leetcode To GitHub",
  version: pkg.version,
  icons: {
    48: "public/logo.png",
  },
  action: {
    default_icon: {
      48: "public/logo.png",
    },
    default_popup: "src/popup/index.html",
  },
  background: {
    service_worker: "src/background/main.ts",
  },
  permissions: ["scripting", "storage", "notifications", "identity"],
  content_scripts: [
    {
      js: ["src/content/main.tsx"],
      matches: ["https://leetcode.com/problems/*"],
    },
  ],
  options_page: "src/options/index.html",
  web_accessible_resources: [
    {
      resources: ["public/injected.js"],
      matches: ["https://leetcode.com/*"],
    },
  ],
});
