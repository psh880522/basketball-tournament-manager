import type { ReactNode } from "react";

type Props = { children?: ReactNode; className?: string };

function Table({ children, className }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
      <table className={`w-full text-sm ${className ?? ""}`.trim()}>{children}</table>
    </div>
  );
}

function Head({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-[#f0f0f0] text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
      <tr>{children}</tr>
    </thead>
  );
}

function HeadCell({ children, className }: Props) {
  return <th className={`px-4 py-3 ${className ?? ""}`.trim()}>{children}</th>;
}

function Body({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

function Row({ children, className }: Props) {
  return (
    <tr className={`border-t border-[#f0f0f0] hover:bg-[#f8f8f8] ${className ?? ""}`.trim()}>
      {children}
    </tr>
  );
}

function Cell({ children, className }: Props) {
  return <td className={`px-4 py-3 text-slate-700 ${className ?? ""}`.trim()}>{children}</td>;
}

Table.Head = Head;
Table.HeadCell = HeadCell;
Table.Body = Body;
Table.Row = Row;
Table.Cell = Cell;

export default Table;
