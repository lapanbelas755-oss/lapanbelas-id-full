import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'index-admin.html'),
        invoice: resolve(__dirname, 'invoice.html'),
        mockPayment: resolve(__dirname, 'mock-payment.html'),
        queue: resolve(__dirname, 'queue.html'),
        pilihFoto: resolve(__dirname, 'pilih-foto.html')
      }
    }
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
});
