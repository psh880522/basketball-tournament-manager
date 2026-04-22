import { redirect } from "next/navigation";
import { getUserWithRole } from "@/src/lib/auth/roles";
import Card from "@/components/ui/Card";
import NewTournamentForm from "./Form";

export default async function NewTournamentPage() {
  const userResult = await getUserWithRole();

  if (userResult.status === "error") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <h1 className="text-2xl font-semibold">대회 생성</h1>
          <Card className="text-sm text-red-600">
            {userResult.error}
          </Card>
        </div>
      </main>
    );
  }

  if (userResult.status === "empty") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <h1 className="text-2xl font-semibold">대회 생성</h1>
          <Card className="text-sm text-gray-600">
            프로필이 없습니다.
          </Card>
        </div>
      </main>
    );
  }

  if (userResult.role !== "organizer") redirect("/dashboard");

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <NewTournamentForm />
      </div>
    </main>
  );
}
