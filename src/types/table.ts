import { ReactNode } from "react";

export interface TableColumn<T = Record<string, unknown>> {
  key: string;
  label: string;
  render?: (value: unknown, row?: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}
