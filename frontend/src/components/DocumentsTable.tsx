import {
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import {
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import type { DocumentDto } from '../entities/document/model/types';
import { fadeIn } from '../shared/lib/animations';
import { formatDate } from '../shared/lib/formatDate';
import { formatFileSize } from '../shared/lib/formatFileSize';
import { cn } from '../shared/lib/utils';

interface DocumentsTableProps {
  documents: DocumentDto[];
  onView: (id: string) => void;
  onDownload: (id: string, originalName: string) => void;
  onDelete: (id: string) => void;
}

export const DocumentsTable = ({
  documents,
  onView,
  onDownload,
  onDelete,
}: DocumentsTableProps) => {
  const { t, i18n } = useTranslation();
  const tableRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tableRef.current) {
      fadeIn(tableRef.current);
    }
  }, []);

  const columns = useMemo<ColumnDef<DocumentDto>[]>(
    () => [
      {
        accessorKey: 'originalName',
        header: t('Имя файла'),
      },
      {
        accessorKey: 'size',
        header: t('Размер'),
        cell: (info) => {
          const value = info.getValue();
          if (typeof value === 'number') {
            return formatFileSize(value, t);
          }
          return String(value);
        },
      },
      {
        accessorKey: 'createdAt',
        header: t('Дата загрузки'),
        cell: (info) => {
          const value = info.getValue();
          if (typeof value === 'string') {
            return formatDate(value, t, i18n.language);
          }
          return String(value);
        },
      },
      {
        id: 'actions',
        header: t('Действия'),
        cell: ({ row }) => (
          <>
            <IconButton
              color="primary"
              onClick={() => onView(row.original.id)}
              size="small"
              title={t('Просмотр')}
            >
              <VisibilityIcon />
            </IconButton>
            <IconButton
              color="primary"
              onClick={() => onDownload(row.original.id, row.original.originalName)}
              size="small"
              title={t('Скачать')}
            >
              <DownloadIcon />
            </IconButton>
            <IconButton
              color="error"
              onClick={() => onDelete(row.original.id)}
              size="small"
              title={t('Удалить')}
            >
              <DeleteIcon />
            </IconButton>
          </>
        ),
      },
    ],
    [onView, onDownload, onDelete, t, i18n.language]
  );

  const table = useReactTable({
    data: documents,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 60,
    overscan: 5,
  });

  return (
    <TableContainer
      ref={tableContainerRef}
      component={Paper}
      className={cn('transition-all max-h-[600px] overflow-auto')}
    >
      <div ref={tableRef}>
        <Table>
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableCell key={header.id} align={header.id === 'actions' ? 'right' : 'left'}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <TableRow
                  key={row.id}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className={cn(
                    'transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      align={cell.column.id === 'actions' ? 'right' : 'left'}
                      className={cn('transition-all')}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TableContainer>
  );
};
