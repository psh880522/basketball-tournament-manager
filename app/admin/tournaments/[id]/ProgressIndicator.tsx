type ProgressProps = {
  state:
    | "TEAM_APPROVAL"
    | "GROUP_STAGE_GENERATED"
    | "MATCH_IN_PROGRESS"
    | "STANDINGS_READY"
    | "BRACKET_READY"
    | "TOURNAMENT_FINISHED";
};

type Step = {
  key: ProgressProps["state"];
  label: string;
};

type StepStatus = "done" | "active" | "pending";

const steps: Step[] = [
  { key: "TEAM_APPROVAL", label: "팀 승인" },
  { key: "GROUP_STAGE_GENERATED", label: "조 생성" },
  { key: "MATCH_IN_PROGRESS", label: "경기 진행" },
  { key: "STANDINGS_READY", label: "순위 계산" },
  { key: "BRACKET_READY", label: "토너먼트" },
  { key: "TOURNAMENT_FINISHED", label: "종료" },
];

export default function ProgressIndicator({ state }: ProgressProps) {
  const statusMap = getStatusMap(state);

  return (
    <ol
      style={{
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        padding: 0,
        listStyle: "none",
      }}
    >
      {steps.map((step, index) => {
        const status = statusMap[index] ?? "pending";
        const color =
          status === "active"
            ? "#1f2937"
            : status === "done"
            ? "#16a34a"
            : "#9ca3af";
        const weight = status === "active" ? 700 : 500;
        return (
          <li key={step.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                backgroundColor: color,
                display: "inline-block",
              }}
            />
            <span style={{ color, fontWeight: weight }}>{step.label}</span>
            <span style={{ color: "#6b7280", fontSize: 12 }}>{status}</span>
            {index < steps.length - 1 ? <span style={{ color: "#d1d5db" }}>→</span> : null}
          </li>
        );
      })}
    </ol>
  );
}

const getStatusMap = (state: ProgressProps["state"]): StepStatus[] => {
  switch (state) {
    case "TEAM_APPROVAL":
      return ["active", "pending", "pending", "pending", "pending", "pending"];
    case "GROUP_STAGE_GENERATED":
      return ["done", "active", "pending", "pending", "pending", "pending"];
    case "MATCH_IN_PROGRESS":
      return ["done", "done", "active", "pending", "pending", "pending"];
    case "STANDINGS_READY":
      return ["done", "done", "done", "active", "pending", "pending"];
    case "BRACKET_READY":
      return ["done", "done", "done", "done", "active", "pending"];
    case "TOURNAMENT_FINISHED":
      return ["done", "done", "done", "done", "done", "done"];
    default:
      return ["pending", "pending", "pending", "pending", "pending", "pending"];
  }
};
