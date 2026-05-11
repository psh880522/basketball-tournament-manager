type StatusDisplay = {
  label: string;
  variant: "default" | "success" | "warning" | "danger" | "info" | "live";
};

export function getTournamentStatusDisplay(
  status: string,
  startDate: string | null
): StatusDisplay {
  if (status === "closed") {
    const today = new Date().toISOString().split("T")[0];
    const inProgress = startDate !== null && startDate <= today;
    return inProgress
      ? { label: "진행중", variant: "info" }
      : { label: "모집마감", variant: "danger" };
  }

  switch (status) {
    case "open":     return { label: "모집중",  variant: "success" };
    case "finished": return { label: "종료",    variant: "default" };
    case "draft":    return { label: "준비중",  variant: "default" };
    default:         return { label: status,   variant: "default" };
  }
}
