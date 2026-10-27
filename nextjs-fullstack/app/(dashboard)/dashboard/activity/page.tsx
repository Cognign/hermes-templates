import { Activity, KeyRound, LogIn, LogOut, Settings, UserPlus, UserMinus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { activityForUser, requirePageUser } from "@/lib/server/auth";
import { ActivityType, type ActivityType as ActivityName } from "@/lib/server/db/schema";

const activityDetails: Record<ActivityName, { label: string; icon: LucideIcon }> = {
  [ActivityType.SIGN_UP]: { label: "Created the account", icon: UserPlus },
  [ActivityType.SIGN_IN]: { label: "Signed in", icon: LogIn },
  [ActivityType.SIGN_OUT]: { label: "Signed out", icon: LogOut },
  [ActivityType.UPDATE_PASSWORD]: { label: "Changed the password", icon: KeyRound },
  [ActivityType.UPDATE_ACCOUNT]: { label: "Updated the profile", icon: Settings },
  [ActivityType.REMOVE_TEAM_MEMBER]: { label: "Removed a team member", icon: UserMinus },
};

export default async function ActivityPage() {
  const context = await requirePageUser();
  const logs = await activityForUser(context);

  return (
    <section className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-semibold">Activity</h1>
      <p className="mt-1 text-sm text-muted-foreground">Shows the latest 20 events.</p>
      {logs.length ? (
        <Card className="mt-6 max-w-3xl">
          <CardContent>
            <ul className="flex flex-col divide-y">
              {logs.map((log) => {
                const detail = activityDetails[log.action as ActivityName];
                const Icon = detail?.icon || Activity;
                return (
                  <li key={log.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                    <span className="rounded-full bg-muted p-2 text-foreground"><Icon className="size-5" aria-hidden="true" /></span>
                    <div>
                      <p className="font-medium">{detail?.label || "Account activity"}</p>
                      <time className="text-muted-foreground" dateTime={log.createdAt.toISOString()}>{log.createdAt.toLocaleString()}</time>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : (
        <Empty className="mt-6 max-w-3xl">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Activity aria-hidden="true" /></EmptyMedia>
            <EmptyTitle>No activity has been recorded yet.</EmptyTitle>
          </EmptyHeader>
        </Empty>
      )}
    </section>
  );
}
