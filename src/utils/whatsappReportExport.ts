export function exportToCSV(rows: any[], filename: string): void {
  if (!rows.length) return;
  
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  
  for (const row of rows) {
    const line = headers.map((h) => {
      const v = row[h];
      if (v == null) return '';
      const s = typeof v === 'string' ? v : JSON.stringify(v);
      const escaped = s.replace(/"/g, '""');
      return '"' + escaped + '"';
    }).join(',');
    lines.push(line);
  }
  
  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
