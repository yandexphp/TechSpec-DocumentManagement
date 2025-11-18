import { exec } from 'node:child_process';
import * as fsSync from 'node:fs';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { Injectable, Logger } from '@nestjs/common';

import type { TNullable } from '../common/types/nullable';

const execAsync = promisify(exec);

type ExcelJSBuffer = Buffer & { readonly [Symbol.toStringTag]: 'ArrayBuffer' };

@Injectable()
export class FileConverterService {
  private readonly logger = new Logger(FileConverterService.name);
  private readonly officeFormats = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/msword',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
  ];

  isConvertible(mimeType: string): boolean {
    return this.officeFormats.includes(mimeType);
  }

  async convertToPdf(fileBuffer: Buffer, originalMimeType: string): Promise<Buffer> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'doc-convert-'));
    const inputPath = path.join(tempDir, `input${this.getExtension(originalMimeType)}`);
    const outputPath = path.join(tempDir, 'output.pdf');

    try {
      await fs.writeFile(inputPath, fileBuffer);

      const libreOfficePath = this.getLibreOfficePath();
      if (libreOfficePath) {
        await this.convertWithLibreOffice(inputPath, outputPath);
      } else {
        await this.convertWithFallback(fileBuffer, originalMimeType, outputPath);
      }

      const pdfBuffer = await fs.readFile(outputPath);
      return pdfBuffer;
    } finally {
      await this.cleanup(tempDir);
    }
  }

  private async convertWithLibreOffice(inputPath: string, outputPath: string): Promise<void> {
    try {
      const libreOfficePath = this.getLibreOfficePath();
      const command = `"${libreOfficePath}" --headless --convert-to pdf --outdir "${path.dirname(outputPath)}" "${inputPath}"`;

      await execAsync(command, { timeout: 30000 });

      const convertedPath = path.join(
        path.dirname(outputPath),
        `${path.basename(inputPath, path.extname(inputPath))}.pdf`
      );

      if (convertedPath !== outputPath) {
        await fs.rename(convertedPath, outputPath);
      }

      this.logger.log('File converted with LibreOffice');
    } catch (error) {
      this.logger.warn(`LibreOffice conversion failed: ${error.message}`);
      throw error;
    }
  }

  private async convertWithFallback(
    fileBuffer: Buffer,
    mimeType: string,
    outputPath: string
  ): Promise<void> {
    if (mimeType.includes('wordprocessingml') || mimeType.includes('msword')) {
      await this.convertDocxToPdf(fileBuffer, outputPath);
    } else if (mimeType.includes('spreadsheetml') || mimeType.includes('excel')) {
      await this.convertXlsxToPdf(fileBuffer, outputPath);
    } else if (mimeType === 'text/plain' || mimeType === 'text/csv') {
      await this.convertTextToPdf(fileBuffer, outputPath);
    } else {
      throw new Error(`Unsupported file type for conversion: ${mimeType}`);
    }
  }

  private async convertDocxToPdf(fileBuffer: Buffer, outputPath: string): Promise<void> {
    try {
      const mammoth = await import('mammoth');
      const PDFDocument = (await import('pdfkit')).default;

      const result = await mammoth.convertToHtml({ buffer: fileBuffer });
      const html = result.value;

      const doc = new PDFDocument();
      const stream = fsSync.createWriteStream(outputPath);
      doc.pipe(stream);

      const lines = html
        .replace(/<[^>]+>/g, '')
        .split('\n')
        .filter((line) => line.trim());

      lines.forEach((line) => {
        doc.text(line, { align: 'left' });
      });

      doc.end();

      await new Promise<void>((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      this.logger.log('DOCX converted to PDF using fallback method');
    } catch (error) {
      this.logger.error(`DOCX conversion failed: ${error.message}`);
      throw error;
    }
  }

  private async convertXlsxToPdf(fileBuffer: Buffer, outputPath: string): Promise<void> {
    try {
      const ExcelJS = await import('exceljs');
      const PDFDocument = (await import('pdfkit')).default;

      const workbook = new ExcelJS.Workbook();
      const excelBuffer = fileBuffer as unknown as ExcelJSBuffer;
      await workbook.xlsx.load(excelBuffer);
      const worksheet = workbook.worksheets[0];

      if (!worksheet) {
        throw new Error('Worksheet not found');
      }

      const data: (string | number | boolean | TNullable<unknown> | undefined)[][] = [];
      let maxColumnCount = 0;

      worksheet.eachRow((row) => {
        const rowData: (string | number | boolean | TNullable<unknown> | undefined)[] = [];

        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          while (rowData.length < colNumber) {
            rowData.push(undefined);
          }

          const cellValue = cell.value;
          let processedValue: string | number | boolean | undefined;

          if (cellValue === null || cellValue === undefined) {
            processedValue = undefined;
          } else if (typeof cellValue === 'object') {
            if (cellValue instanceof Date) {
              processedValue = cellValue.toISOString();
            } else {
              processedValue = cell.text || String(cellValue);
            }
          } else {
            processedValue = cellValue as string | number | boolean;
          }

          rowData[colNumber - 1] = processedValue;
        });

        maxColumnCount = Math.max(maxColumnCount, rowData.length);
        data.push(rowData);
      });

      data.forEach((row) => {
        while (row.length < maxColumnCount) {
          row.push(undefined);
        }
      });

      const doc = new PDFDocument({ margin: 50 });
      const stream = fsSync.createWriteStream(outputPath);
      doc.pipe(stream);

      const maxWidth = 500;
      const firstRow = data[0];
      const colCount = Array.isArray(firstRow) ? firstRow.length : 1;
      const colWidth = maxWidth / colCount;

      data.forEach(
        (row: (string | number | boolean | TNullable<unknown> | undefined)[], rowIndex) => {
          const y = 50 + rowIndex * 20;
          if (y > 750) {
            doc.addPage();
          }

          row.forEach(
            (cell: string | number | boolean | TNullable<unknown> | undefined, colIndex) => {
              const x = 50 + colIndex * colWidth;
              doc.text(String(cell || ''), x, y > 750 ? 50 : y, {
                width: colWidth - 5,
                align: 'left',
              });
            }
          );
        }
      );

      doc.end();

      await new Promise<void>((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      this.logger.log('XLSX converted to PDF using fallback method');
    } catch (error) {
      this.logger.error(`XLSX conversion failed: ${error.message}`);
      throw error;
    }
  }

  private async convertTextToPdf(fileBuffer: Buffer, outputPath: string): Promise<void> {
    try {
      const PDFDocument = (await import('pdfkit')).default;
      const text = fileBuffer.toString('utf-8');

      const doc = new PDFDocument({ margin: 50 });
      const stream = fsSync.createWriteStream(outputPath);
      doc.pipe(stream);

      const lines = text.split('\n');
      lines.forEach((line) => {
        doc.text(line, { align: 'left' });
      });

      doc.end();

      await new Promise<void>((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      this.logger.log('Text file converted to PDF');
    } catch (error) {
      this.logger.error(`Text conversion failed: ${error.message}`);
      throw error;
    }
  }

  private getLibreOfficePath(): TNullable<string> {
    const paths = [
      'libreoffice',
      '/usr/bin/libreoffice',
      '/usr/local/bin/libreoffice',
      'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
      'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
    ];

    for (const p of paths) {
      try {
        fsSync.accessSync(p, fsSync.constants.F_OK);
        return p;
      } catch {
        this.logger.debug(`LibreOffice path not found: ${p}`);
      }
    }

    return null;
  }

  private getExtension(mimeType: string): string {
    const extensions: { [key: string]: string } = {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'application/vnd.ms-excel': '.xls',
      'application/msword': '.doc',
      'application/vnd.ms-powerpoint': '.ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
      'text/plain': '.txt',
      'text/csv': '.csv',
    };
    return extensions[mimeType] || '.bin';
  }

  private async cleanup(dir: string): Promise<void> {
    try {
      const files = await fs.readdir(dir);
      await Promise.all(files.map((file) => fs.unlink(path.join(dir, file))));
      await fs.rmdir(dir);
    } catch (error) {
      this.logger.warn(`Failed to cleanup temp directory: ${error.message}`);
    }
  }
}
