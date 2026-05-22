'use client';

import { ReactNode, useState } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useRouter } from 'next/navigation';

interface Column {
    id: string;
    label: string;
    minWidth?: number;
    align?: 'right';
    format?: (value: unknown) => string;
}

interface CustomTableProps {
    columns: Column[];
    data: Array<Record<string, unknown> & { id: string | number }>;
    editBasePath?: string;
    onEdit?: (id: string) => void;
}

export function CustomTable({ columns, data, editBasePath, onEdit }: CustomTableProps) {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const router = useRouter();
    const renderCellValue = (value: unknown): ReactNode => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
        return String(value);
    };

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(+event.target.value);
        setPage(0);
    };

    const handleEdit = (id: string) => {
        if (onEdit) {
            onEdit(id);
            return;
        }

        if (editBasePath) {
            router.push(`${editBasePath}/${id}/edit`);
        }
    };

    return (
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            <TableContainer sx={{ maxHeight: 440 }}>
                <Table stickyHeader size="small" aria-label="sticky table">
                    <TableHead>
                        <TableRow>
                            {columns.map((column) => (
                                <TableCell
                                    key={column.id}
                                    align={column.align}
                                    // Reduce padding vertical del header para compactar altura de filas.
                                    sx={{ py: 0.5 }}
                                    style={{ minWidth: column.minWidth }}
                                >
                                    {column.label}
                                </TableCell>
                            ))}
                            {(editBasePath || onEdit) && <TableCell sx={{ py: 0.5 }}>{/* Header de acciones compacto */}Actions</TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data
                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                            .map((row) => {
                                const rowId = String(row.id);
                                return (
                                    <TableRow hover role="checkbox" tabIndex={-1} key={rowId}>
                                        {columns.map((column) => {
                                            const value = row[column.id];
                                            return (
                                                <TableCell key={column.id} align={column.align} sx={{ py: 1.5 }}>{/* Menor padding vertical en celdas del body */}
                                                    {column.format
                                                        ? column.format(value)
                                                        : renderCellValue(value)}
                                                </TableCell>
                                            );
                                        })}
                                        {(editBasePath || onEdit) && (
                                            <TableCell sx={{ py: 0.75 }}>{/* Menor padding vertical en celda de acciones */}
                                                <IconButton size="small" sx={{ p: 0.25 }} onClick={() => handleEdit(rowId)}>{/* Boton mas pequeno para no forzar alto de fila */}
                                                    <EditIcon />
                                                </IconButton>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                );
                            })}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                rowsPerPageOptions={[10, 25, 100]}
                component="div"
                count={data.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
            />
        </Paper>
    );
}
