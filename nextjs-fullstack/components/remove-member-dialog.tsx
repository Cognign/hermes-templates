"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/** "Remove" for one team member. The member is only removed after the owner confirms. */
export function RemoveMemberDialog({ memberLabel, action }: { memberLabel: string; action: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" aria-label={`Remove ${memberLabel}`}>
          Remove
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form method="post" action={action} className="contents">
          <AlertDialogHeader>
            <AlertDialogTitle className="wrap-anywhere">Remove {memberLabel}?</AlertDialogTitle>
            <AlertDialogDescription>
              They lose access to this team straight away.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              className="bg-destructive! text-destructive-foreground! hover:bg-destructive/90!"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
