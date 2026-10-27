import { requirePageUser, teamForUser } from "@/lib/server/auth";
import { safeMessage } from "@/lib/http";
import { FormMessage } from "@/components/form-message";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const context = await requirePageUser();
  const team = await teamForUser(context);
  const messages = await searchParams;
  const error = safeMessage(messages.error || null);
  const success = safeMessage(messages.success || null);
  const isOwner = context.membership.role === "owner";

  return (
    <section className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="min-w-0">
        <p className="text-sm font-medium text-muted-foreground">Team</p>
        <h1 className="mt-1 text-2xl font-semibold break-words">{team.name}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-base font-semibold">Members</h2>
          </CardTitle>
          <CardDescription>Only team owners can remove another member.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormMessage error={error} success={success} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className="hidden sm:table-cell">Role</TableHead>
                {isOwner ? <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.members.map((member) => {
                const label = member.name || member.email;
                return (
                  <TableRow key={member.membershipId}>
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{label.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="max-w-[10rem] truncate font-medium sm:max-w-[16rem]">{label}</p>
                          <p className="max-w-[10rem] truncate text-sm text-muted-foreground sm:max-w-[16rem]">{member.email}</p>
                          <Badge variant="secondary" className="mt-1 sm:hidden">{member.role}</Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary">{member.role}</Badge>
                    </TableCell>
                    {isOwner ? (
                      <TableCell className="text-right">
                        {member.membershipId !== context.membership.id ? (
                          <form method="post" action={`/api/team/members/${member.membershipId}`}>
                            <Button type="submit" variant="outline" size="sm">Remove</Button>
                          </form>
                        ) : null}
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
