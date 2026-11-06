import { describe, it, expect } from 'vitest';
import manifest from '@/app/manifest';
import fs from 'fs';
import path from 'path';

describe('PWA Manifest & Assets', () => {
  it('provides a valid PWA manifest matching requirements', () => {
    const data = manifest();
    expect(data.name).toBe('Personal OS');
    expect(data.short_name).toBe('Personal OS');
    expect(data.display).toBe('standalone');
    expect(data.start_url).toBe('/');
    expect(data.theme_color).toBeDefined();
    expect(data.background_color).toBeDefined();

    expect(data.icons).toBeDefined();
    expect(data.icons?.length).toBeGreaterThanOrEqual(2);

    const icon192 = data.icons?.find((i) => i.sizes === '192x192');
    const icon512 = data.icons?.find((i) => i.sizes === '512x512');
    expect(icon192).toBeDefined();
    expect(icon512).toBeDefined();
  });

  it('verifies offline fallback page exists and is valid HTML', () => {
    const offlinePath = path.resolve(import.meta.dirname, '../../public/offline.html');
    expect(fs.existsSync(offlinePath)).toBe(true);
    const content = fs.readFileSync(offlinePath, 'utf8');
    expect(content).toContain('<!DOCTYPE html>');
    expect(content).toContain('offline');
  });

  it('verifies service worker file exists and caches offline fallback', () => {
    const swPath = path.resolve(import.meta.dirname, '../../public/sw.js');
    expect(fs.existsSync(swPath)).toBe(true);
    const content = fs.readFileSync(swPath, 'utf8');
    expect(content).toContain('/offline.html');
    expect(content).toContain('addEventListener');
  });

  it('verifies PWA icon assets exist on disk', () => {
    const icon192Path = path.resolve(import.meta.dirname, '../../public/icons/icon-192.png');
    const icon512Path = path.resolve(import.meta.dirname, '../../public/icons/icon-512.png');
    expect(fs.existsSync(icon192Path)).toBe(true);
    expect(fs.existsSync(icon512Path)).toBe(true);
  });
});
