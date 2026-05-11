type Props = {
  message: string;
  className?: string;
};

export default function EmptyState({ message, className }: Props) {
  return (
    <p className={`text-sm text-gray-500 ${className ?? ""}`}>{message}</p>
  );
}
