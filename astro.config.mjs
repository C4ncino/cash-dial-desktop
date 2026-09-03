import { webcore } from "webcoreui/integration";
// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

import icon from 'astro-icon';

import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'http://localhost:4321',
  integrations: [sitemap(), icon(), webcore(), react()],
  output: "static",

  vite: {
    plugins: [tailwindcss()],
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler'
        }
      }
    }
  },
});