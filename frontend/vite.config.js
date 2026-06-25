import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          motion: ["framer-motion"],
          realtime: ["socket.io-client", "zustand", "axios"]
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true
  }
});
