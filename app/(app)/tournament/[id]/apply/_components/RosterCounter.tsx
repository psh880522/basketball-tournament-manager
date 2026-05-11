type Props = {
  count: number;
  min: number;
};

export default function RosterCounter({ count, min }: Props) {
  if (count >= min) {
    return (
      <p className="text-xs text-emerald-600">
        {count}명 선택됨 ✓
      </p>
    );
  }
  if (count === 0) {
    return (
      <p className="text-xs text-amber-600">
        최소 {min}명 이상 선택해주세요
      </p>
    );
  }
  return (
    <p className="text-xs text-amber-600">
      {count}명 선택됨 / 최소 {min}명 이상 필요
    </p>
  );
}
