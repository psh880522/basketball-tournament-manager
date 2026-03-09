"use client";

import { useFormStatus } from "react-dom";
import { calculateDivisionStandings } from "./actions";

type Props = {
  tournamentId: string;
  divisionId: string;
  disabled?: boolean;
};

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="rounded-md bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
      disabled={disabled || pending}
    >
      {pending ? "계산 중..." : "순위 계산"}
    </button>
  );
}

export default function StandingsForm({
  tournamentId,
  divisionId,
  disabled,
}: Props) {
  return (
    <form action={calculateDivisionStandings}>
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <input type="hidden" name="divisionId" value={divisionId} />
      <SubmitButton disabled={disabled} />
    </form>
  );
}
