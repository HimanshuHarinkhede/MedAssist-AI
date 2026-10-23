import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import type { ReactNode } from "react";

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => ReactNode);
}

interface TableComponentProps<T> {
  columns: Column<T>[];
  data: T[];
}

export function TableComponent<T extends { id?: string; _id?: string }>({ columns, data }: TableComponentProps<T>) {
  return (
    <div className="stat-card p-0 overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {columns.map((col, i) => (
                <TableHead key={i} className="font-semibold sticky top-0 bg-muted/50 whitespace-nowrap">{col.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, idx) => (
              <TableRow key={(row._id || row.id || idx)} className="hover:bg-muted/30 transition-colors duration-150">
                {columns.map((col, i) => (
                  <TableCell key={i} className="whitespace-nowrap">
                    {typeof col.accessor === "function" ? col.accessor(row) : String(row[col.accessor] ?? "")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  No data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
