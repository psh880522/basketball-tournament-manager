import type { ReactNode } from "react";

type Props = { children: ReactNode; className?: string };

function Table({ children, className }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className={`w-full text-sm ${className ?? ""}`.trim()}>{children}</table>
    </div>
  );
}

function Head({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500">
      <tr>{children}</tr>
    </thead>
  );
}

function HeadCell({ children, className }: Props) {
  return <th className={`px-3 py-2 ${className ?? ""}`.trim()}>{children}</th>;
}

function Body({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-gray-100">{children}</tbody>;
}

function Row({ children, className }: Props) {
  return <tr className={`hover:bg-gray-50 ${className ?? ""}`.trim()}>{children}</tr>;
}

function Cell({ children, className }: Props) {
  return <td className={`px-3 py-2 text-gray-700 ${className ?? ""}`.trim()}>{children}</td>;
}

Table.Head = Head;
Table.HeadCell = HeadCell;
Table.Body = Body;
Table.Row = Row;
Table.Cell = Cell;

export default Table;
