function escapePdfText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function chunkText(text, maxLength = 88) {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

export function downloadResumePdf(user) {
  const sections = [];
  sections.push(`Name: ${user.name || ''}`);
  sections.push(`Email: ${user.email || ''}`);
  sections.push(`Role: ${(user.role || '').replace('_', ' ')}`);
  sections.push('');
  sections.push('Professional Summary');
  sections.push(...chunkText(user.bio || ''));
  sections.push('');
  sections.push('Skills');
  sections.push(...chunkText((user.skills || []).join(', ') || 'No skills listed.'));
  sections.push('');
  sections.push('Education');
  for (const item of user.education || []) {
    sections.push(...chunkText(`${item.degree || ''} | ${item.institution || ''} | ${item.year || ''}`));
  }
  sections.push('');
  sections.push('Experience');
  for (const item of user.experience || []) {
    sections.push(...chunkText(`${item.title || ''} | ${item.company || ''} | ${item.from || ''} - ${item.current ? 'Present' : item.to || ''}`));
  }
  sections.push('');
  sections.push('Publications');
  for (const item of user.publications || []) {
    sections.push(...chunkText(`${item.title || ''} | ${item.journal || ''} | ${item.year || ''} | ${item.link || ''}`));
  }

  const pageHeight = 792;
  const startY = 760;
  const lineHeight = 16;
  const pages = [];
  let currentPage = [];
  let y = startY;

  for (const line of sections) {
    if (y < 60) {
      pages.push(currentPage);
      currentPage = [];
      y = startY;
    }
    currentPage.push(`BT /F1 12 Tf 50 ${y} Td (${escapePdfText(line)}) Tj ET`);
    y -= lineHeight;
  }
  if (currentPage.length) pages.push(currentPage);

  const objects = [];
  objects.push('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj');
  const kids = pages.map((_, index) => `${3 + index} 0 R`).join(' ');
  objects.push(`2 0 obj << /Type /Pages /Count ${pages.length} /Kids [${kids}] >> endobj`);

  const contentObjectIds = [];
  pages.forEach((pageLines, index) => {
    const pageObjectId = 3 + index;
    const contentObjectId = 3 + pages.length + index;
    contentObjectIds.push(contentObjectId);
    objects.push(`${pageObjectId} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 ${pageHeight}] /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R >> >> /Contents ${contentObjectId} 0 R >> endobj`);
    const stream = pageLines.join('\n');
    objects.push(`${contentObjectId} 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`);
  });

  const fontObjectId = 3 + pages.length * 2;
  objects.push(`${fontObjectId} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj`);

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${(user.name || 'resume').replace(/\s+/g, '_')}_resume.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
