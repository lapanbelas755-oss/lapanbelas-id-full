import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Clean URL rewrite middleware untuk Vite dev server
const cleanUrlsPlugin = () => ({
  name: 'clean-urls',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = req.url.split('?')[0];
      if (url === '/booking' || url === '/booking/' || url.startsWith('/booking/')) {
        req.url = '/booking.html' + (req.url.includes('?') ? '?' + req.url.split('?')[1] : '');
      } else if (url === '/admin' || url === '/admin/' || url.startsWith('/admin/')) {
        req.url = '/index-admin.html' + (req.url.includes('?') ? '?' + req.url.split('?')[1] : '');
      } else if (url === '/queue' || url === '/queue/' || url.startsWith('/queue/')) {
        req.url = '/queue.html' + (req.url.includes('?') ? '?' + req.url.split('?')[1] : '');
      } else if (url === '/feedback' || url === '/feedback/' || url.startsWith('/feedback/')) {
        req.url = '/feedback.html' + (req.url.includes('?') ? '?' + req.url.split('?')[1] : '');
      } else if (url === '/invoice' || url === '/invoice/' || url.startsWith('/invoice/')) {
        req.url = '/invoice.html' + (req.url.includes('?') ? '?' + req.url.split('?')[1] : '');
      } else if (url === '/crew' || url === '/crew/' || url.startsWith('/crew/')) {
        req.url = '/crew.html' + (req.url.includes('?') ? '?' + req.url.split('?')[1] : '');
      } else if (url === '/pilih-foto' || url === '/pilih-foto/' || url.startsWith('/pilih-foto/')) {
        req.url = '/pilih-foto.html' + (req.url.includes('?') ? '?' + req.url.split('?')[1] : '');
      }
      next();
    });
  }
});

export default defineConfig({
  plugins: [react(), cleanUrlsPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'index-admin.html'),
        invoice: resolve(__dirname, 'invoice.html'),
        mockPayment: resolve(__dirname, 'mock-payment.html'),
        queue: resolve(__dirname, 'queue.html'),
        pilihFoto: resolve(__dirname, 'pilih-foto.html'),
        feedback: resolve(__dirname, 'feedback.html'),
        booking: resolve(__dirname, 'booking.html'),
        crew: resolve(__dirname, 'crew.html')
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('axios')) {
              return 'vendor-axios';
            }
          }
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
});

