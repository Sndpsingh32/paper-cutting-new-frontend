function escapeCsvValue(value: unknown): string {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

export interface CsvColumn<T> {
    header: string;
    getValue: (row: T) => string | number;
}

export function downloadCsv<T>(
    filename: string,
    columns: CsvColumn<T>[],
    rows: T[]
): void {
    const headerLine = columns.map((col) => escapeCsvValue(col.header)).join(",");
    const dataLines = rows.map((row) =>
        columns.map((col) => escapeCsvValue(col.getValue(row))).join(",")
    );
    const csv = [headerLine, ...dataLines].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}
