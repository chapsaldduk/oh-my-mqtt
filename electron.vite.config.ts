import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  main: {
    build: {
      // @ts-expect-error electron-vite custom option
      externalizeDeps: false,
      rollupOptions: {
        input: resolve(__dirname, "electron/main.ts"),
        output: {
          entryFileNames: "index.js",
        },
        external: ["bufferutil", "utf-8-validate"],
      },
    },
  },
  preload: {
    build: {
      rollupOptions: {
        input: resolve(__dirname, "electron/preload.ts"),
        external: ["electron"],
      },
    },
  },
  renderer: {
    root: ".",
    build: {
      rollupOptions: {
        input: resolve(__dirname, "index.html"),
      },
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
      },
    },
  },
});
