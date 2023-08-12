import { defineConfig } from "vite";
import commonjs from "vite-plugin-commonjs";

export default defineConfig({
  plugins: [commonjs(/* options */)],
  test: {
    setupFiles: [
      './test/__setup__.js'
    ],
    globals: true,
    environment: 'jsdom'
  },
});
