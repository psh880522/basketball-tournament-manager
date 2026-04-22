export type DashboardSummary = {
  teamCount: number;
  captainTeamCount: number;
  activeApplicationCount: number;
  thisWeekMatchCount: number;
  pendingActionCount: number;
};

export type PendingActionType = "payment" | "roster" | "team_join_approval";

export type PendingAction = {
  type: PendingActionType;
  teamId: string;
  teamName: string;
  applicationId?: string;
  tournamentName?: string;
  label: string;
  href: string;
  urgency: "high" | "medium" | "low";
  meta?: string;
};

export type UpcomingMatch = {
  matchId: string;
  tournamentId: string;
  tournamentName: string;
  divisionName: string;
  myTeamId: string;
  myTeamName: string;
  opponentTeamId: string;
  opponentTeamName: string;
  scheduledAt: string;
  courtName: string | null;
  roundLabel: string | null;
};

export type CompletedMatch = {
  matchId: string;
  tournamentName: string;
  divisionName: string;
  myTeamId: string;
  myTeamName: string;
  opponentTeamName: string;
  myScore: number;
  opponentScore: number;
  isWin: boolean;
};

export type TeamApplication = {
  applicationId: string;
  tournamentId: string;
  tournamentName: string;
  divisionName: string;
  status: string;
  nextMatch: UpcomingMatch | null;
};

export type MyTeamWithApplications = {
  teamId: string;
  teamName: string;
  roleInTeam: "captain" | "player";
  activeApplications: TeamApplication[];
};
