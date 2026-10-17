import path from "node:path";
import { Config } from "@remotion/cli/config";

Config.setEntryPoint("./src/remotion/index.ts");
Config.setCodec("h264");
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

// Make the "@/*" tsconfig alias work inside Remotion's webpack
Config.overrideWebpackConfig((config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    alias: {
      ...(config.resolve?.alias ?? {}),
      "@": path.resolve(process.cwd(), "src"),
    },
  },
}));
