// Kanban 866cb61a (teszt-strategia, 4. kategoria: biztonsag): "service_role
// kulcs SOHA ne keruljon a frontend buildbe (csak anon kulcs)".
//
// A korabbi scripts/system-test.ts erre vonatkozo "tesztje" a SOURCE fajlokban
// greppelt a literal "service_role" SZO-ra -- ez ketszeresen hibas: (1) egy
// valodi, leszivargott service_role JWT maga base64url-kodolt, a nyers tokenben
// NEM jelenik meg a "service_role" substring szo szerint (csak a dekodolt
// payloadban), tehat egy grep ezt soha nem kapna el; (2) a forraskodot nezte,
// nem a BUILD KIMENETET (dist/), ami az, amit a bongeszo tenylegesen letolt.
// Ez a teszt a valodi JWT-ket keresi meg es DEKODOLJA a payload-jukat, a
// tenyleges role claim-et nezve, a buildelt dist/ fajlokban.
import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const JWT_PATTERN = /[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;

function base64UrlDecode(segment: string): string {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/').padEnd(segment.length + (4 - (segment.length % 4 || 4)) % 4, '=');
  return Buffer.from(padded, 'base64').toString('utf-8');
}

function findJwtRoleClaims(content: string): string[] {
  const roles: string[] = [];
  const matches = content.match(JWT_PATTERN) || [];
  for (const candidate of matches) {
    const parts = candidate.split('.');
    if (parts.length !== 3) continue;
    try {
      const payload = JSON.parse(base64UrlDecode(parts[1]));
      if (payload && typeof payload === 'object' && 'role' in payload) {
        roles.push(String(payload.role));
      }
    } catch {
      // Nem valodi JWT (pl. veletlen pont-elvalasztott hash), figyelmen kivul hagyva.
    }
  }
  return roles;
}

describe('Biztonsag -- service_role kulcs SOHA ne keruljon a frontend buildbe', () => {
  let distFiles: string[] = [];
  let distDir: string;

  beforeAll(() => {
    distDir = path.resolve(__dirname, '../../dist');
    if (!fs.existsSync(distDir)) {
      throw new Error(
        'A dist/ build nem letezik -- futtasd `npm run build`-et ELOSZOR, ez a teszt a TENYLEGES buildelt kimenetet vizsgalja, nem a forraskodot.'
      );
    }
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        return entry.isDirectory() ? walk(full) : full.endsWith('.js') || full.endsWith('.html') ? [full] : [];
      });
    distFiles = walk(distDir);
  });

  it('a dist/ build legalabb egy JS fajlt tartalmaz (sanity-check, hogy a scan tenyleg lefut valamin)', () => {
    expect(distFiles.length).toBeGreaterThan(0);
  });

  it('a buildelt kimenetben talalt JWT-k kozul EGYIKNEK sincs role=service_role claim-je', () => {
    const offendingFiles: string[] = [];
    for (const file of distFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const roles = findJwtRoleClaims(content);
      if (roles.includes('service_role')) {
        offendingFiles.push(file);
      }
    }
    expect(offendingFiles).toEqual([]);
  });

  it('a buildelt kimenetben van (anon-role) JWT -- igazolja hogy a scan NEM azert megy at, mert nincs is JWT a bundle-ben', () => {
    const anonRolesFound = new Set<string>();
    for (const file of distFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      findJwtRoleClaims(content).forEach((r) => anonRolesFound.add(r));
    }
    expect(anonRolesFound.has('anon')).toBe(true);
  });
});
