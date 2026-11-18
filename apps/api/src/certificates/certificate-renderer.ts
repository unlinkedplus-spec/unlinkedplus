export interface CertificateText {
  id: string;
  createdAt: Date;
  category: string;
  content: string;
}

function cleanText(value: string, max: number): string {
  const characters = Array.from(value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\uFFFE\uFFFF]/g, '')
    .replace(/[\uD800-\uDFFF]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim());
  return characters.length > max ? `${characters.slice(0, max - 1).join('')}…` : characters.join('');
}

function escapeXml(value: string): string {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
  return value.replace(/[&<>"']/g, (character) => entities[character]);
}

function wrap(value: string, width: number): string[] {
  const remaining = Array.from(value);
  const lines: string[] = [];
  while (remaining.length) {
    let count = 0;
    let columns = 0;
    while (count < remaining.length) {
      const nextWidth = /[^\u0000-\u007f]/u.test(remaining[count]) ? 2 : 1;
      if (columns + nextWidth > width) break;
      columns += nextWidth;
      count++;
    }
    if (count < remaining.length) {
      const space = remaining.slice(0, count + 1).lastIndexOf(' ');
      if (space >= Math.floor(count / 2)) count = space;
    }
    lines.push(remaining.splice(0, count).join('').trim());
    while (remaining[0] === ' ') remaining.shift();
  }
  return lines;
}

export function renderCertificateSvg(certificate: CertificateText): string {
  const wrapped = wrap(cleanText(certificate.content, 280), 72);
  const content = wrapped.slice(0, 9);
  if (wrapped.length > content.length) content[8] = `${Array.from(content[8]).slice(0, -2).join('')}…`;
  const date = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(certificate.createdAt);
  const lines = content.map((line, index) =>
    `<text x="130" y="${310 + index * 36}" font-family="monospace" font-size="22">${escapeXml(line)}</text>`,
  ).join('');

  // Only escaped, bounded plain text enters SVG; no user markup, URLs, or identity hashes are rendered.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="850" viewBox="0 0 1200 850">
  <rect width="1200" height="850" fill="#f6f2e9"/>
  <rect x="38" y="38" width="1124" height="774" rx="8" fill="none" stroke="#263b34" stroke-width="3"/>
  <g font-family="sans-serif" fill="#263b34">
    <text x="90" y="112" font-size="31" font-weight="bold">unlinked+</text>
    <text x="90" y="190" font-size="52" font-weight="bold">SERTIFIKAT BERTAHAN</text>
    <text x="92" y="239" font-size="19">${escapeXml(cleanText(certificate.category, 50))}</text>
    <path d="M90 263 H1110" stroke="#aab4a9"/>
    ${lines}
    <path d="M90 668 H1110" stroke="#aab4a9"/>
    <text x="92" y="709" font-size="21">Tetap bertahan. Tidak harus selalu terlihat berhasil.</text>
    <text x="92" y="748" font-size="17">${escapeXml(date)} · Dokumen pribadi, bukan sertifikasi profesional</text>
    <text x="92" y="780" font-size="14">ID ${escapeXml(cleanText(certificate.id, 36))}</text>
  </g>
</svg>`;
}
