import * as fs from 'node:fs';
import * as path from 'node:path';

export function getDateFolder(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}-${month}-${year}`;
}

export function getLogFilePath(filename: string, logsDir: string): string {
  const dateFolder = getDateFolder();
  const dateDir = path.join(logsDir, dateFolder);
  if (!fs.existsSync(dateDir)) {
    fs.mkdirSync(dateDir, { recursive: true });
  }
  return path.join(dateDir, filename);
}
