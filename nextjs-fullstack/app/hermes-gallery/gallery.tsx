"use client";

import { useLayoutEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { InboxIcon, MoreHorizontalIcon, PlusIcon, SettingsIcon, TrashIcon } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { styleIds, type Mode, type StyleId } from "./styles";

const longName = "Maximiliana Wolfeschlegelsteinhausen-Bergerdorff";

const members = [
  { name: "Ada Lovelace", email: "ada@example.com", role: "Owner" },
  { name: longName, email: "maximiliana.wolfeschlegelsteinhausen@example.com", role: "Member" },
  { name: "Li Wei", email: "li@example.com", role: "Member" },
];

/** Puts the chosen style and mode on <html>, where portalled overlays also inherit them. */
function useDocumentStyle(style: StyleId, mode: Mode) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    for (const id of styleIds) root.classList.toggle(`style-${id}`, id === style);
    root.classList.toggle("dark", mode === "dark");
  }, [style, mode]);
}

export function Gallery({ style, mode }: { style: StyleId; mode: Mode }) {
  useDocumentStyle(style, mode);
  return (
    <TooltipProvider>
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6">
        <header className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Style gallery</h1>
          <nav aria-label="Design style" className="flex flex-wrap gap-2">
            {styleIds.map((id) => (
              <Button key={id} asChild size="sm" variant={id === style ? "default" : "outline"}>
                <Link href={`?style=${id}&mode=${mode}`} aria-current={id === style ? "page" : undefined}>
                  {id}
                </Link>
              </Button>
            ))}
          </nav>
          <nav aria-label="Colour mode" className="flex gap-2">
            {(["light", "dark"] as const).map((value) => (
              <Button key={value} asChild size="sm" variant={value === mode ? "default" : "outline"}>
                <Link href={`?style=${style}&mode=${value}`} aria-current={value === mode ? "page" : undefined}>
                  {value === "light" ? "Light" : "Dark"}
                </Link>
              </Button>
            ))}
          </nav>
        </header>
        <Buttons />
        <div className="grid gap-6 lg:grid-cols-2">
          <ProfileCard />
          <Preferences />
        </div>
        <Feedback />
        <MembersTable />
        <Overlays />
      </div>
    </TooltipProvider>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby={`section-${title}`}>
      <h2 id={`section-${title}`} className="text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Buttons() {
  return (
    <Section title="Buttons and badges">
      <div className="flex flex-wrap items-center gap-3">
        <Button>Save changes</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Delete</Button>
        <Button variant="link">Link</Button>
        <Button disabled>Disabled</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="xs">Extra small</Button>
        <Button size="sm">Small</Button>
        <Button size="lg">Large</Button>
        <Button size="icon" variant="outline" aria-label="Add">
          <PlusIcon />
        </Button>
        <Button size="sm" variant="outline">
          <SettingsIcon data-icon="inline-start" />
          Settings
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge>Active</Badge>
        <Badge variant="secondary">Draft</Badge>
        <Badge variant="outline">Archived</Badge>
        <Badge variant="destructive">Overdue</Badge>
      </div>
    </Section>
  );
}

function ProfileCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your name and email address.</CardDescription>
        <CardAction>
          <Badge variant="secondary">Owner</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <form className="contents" onSubmit={(event) => event.preventDefault()}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="gallery-name">Name</FieldLabel>
              <Input id="gallery-name" defaultValue={longName} />
            </Field>
            <Field data-invalid="true">
              <FieldLabel htmlFor="gallery-email">Email</FieldLabel>
              <Input id="gallery-email" type="email" aria-invalid="true" defaultValue="ada@" />
              <FieldError>Enter a full email address, such as ada@example.com.</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="gallery-bio">About you</FieldLabel>
              <Textarea id="gallery-bio" placeholder="A sentence or two" />
              <FieldDescription>Shown to people on your team.</FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className="flex-wrap gap-2">
        <Button>Save</Button>
        <Button variant="outline">Cancel</Button>
      </CardFooter>
    </Card>
  );
}

function Preferences() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <CardDescription>Choose how the app keeps you informed.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="gallery-frequency">Summary email</FieldLabel>
            <Select defaultValue="weekly">
              <SelectTrigger id="gallery-frequency" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Every day</SelectItem>
                <SelectItem value="weekly">Every week</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field orientation="horizontal">
            <Checkbox id="gallery-mentions" defaultChecked />
            <FieldLabel htmlFor="gallery-mentions">Email me when someone mentions me</FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <Checkbox id="gallery-digest" />
            <FieldLabel htmlFor="gallery-digest">Include finished tasks</FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <Switch id="gallery-sounds" defaultChecked />
            <FieldLabel htmlFor="gallery-sounds">Play sounds</FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <Switch id="gallery-compact" />
            <FieldLabel htmlFor="gallery-compact">Compact lists</FieldLabel>
          </Field>
          <FieldSet>
            <FieldLegend variant="label">Start page</FieldLegend>
            <RadioGroup defaultValue="dashboard">
              <Field orientation="horizontal">
                <RadioGroupItem value="dashboard" id="gallery-start-dashboard" />
                <Label htmlFor="gallery-start-dashboard">Dashboard</Label>
              </Field>
              <Field orientation="horizontal">
                <RadioGroupItem value="tasks" id="gallery-start-tasks" />
                <Label htmlFor="gallery-start-tasks">My tasks</Label>
              </Field>
            </RadioGroup>
          </FieldSet>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

function Feedback() {
  return (
    <Section title="Messages and states">
      <div className="grid gap-4 lg:grid-cols-2">
        <Alert>
          <InboxIcon />
          <AlertTitle>Changes saved</AlertTitle>
          <AlertDescription>Your profile now shows the new name.</AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <TrashIcon />
          <AlertTitle>Could not delete the project</AlertTitle>
          <AlertDescription>It still has open tasks. Close them first.</AlertDescription>
        </Alert>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <InboxIcon />
            </EmptyMedia>
            <EmptyTitle>No tasks yet</EmptyTitle>
            <EmptyDescription>Tasks you add will appear here.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm">Add a task</Button>
          </EmptyContent>
        </Empty>
        <div className="flex flex-col gap-4">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="text-sm">
              Three projects, twelve open tasks.
            </TabsContent>
            <TabsContent value="activity" className="text-sm">
              No activity this week.
            </TabsContent>
            <TabsContent value="settings" className="text-sm">
              Settings live on their own page.
            </TabsContent>
          </Tabs>
          <Separator />
          <div className="flex items-center gap-3" aria-label="Loading">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

function MembersTable() {
  return (
    <Section title="Table">
      <Table className="table-fixed">
        <TableCaption>Members of the Design team.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="w-24">Role</TableHead>
            <TableHead className="w-20 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.email}>
              <TableCell>
                {/* Style files set nowrap on the cell itself, so wrapping is allowed one level down. */}
                <div className="flex min-w-0 items-center gap-3 whitespace-normal">
                  <Avatar>
                    <AvatarFallback>
                      {member.name
                        .split(" ")
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="font-medium wrap-anywhere">{member.name}</span>
                    <span className="text-muted-foreground wrap-anywhere">{member.email}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={member.role === "Owner" ? "default" : "outline"}>{member.role}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${member.name}`}>
                  <MoreHorizontalIcon />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Section>
  );
}

function Overlays() {
  return (
    <Section title="Overlays">
      <div className="flex flex-wrap items-center gap-3">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename project</DialogTitle>
              <DialogDescription>Everyone on the team sees the new name.</DialogDescription>
            </DialogHeader>
            <Field>
              <FieldLabel htmlFor="gallery-project">Project name</FieldLabel>
              <Input id="gallery-project" defaultValue="Website relaunch" />
            </Field>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button>Rename</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline">Open confirmation</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove {longName}?</AlertDialogTitle>
              <AlertDialogDescription>They lose access to this team straight away.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive">Remove</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">Open sheet</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>Show only the tasks you need.</SheetDescription>
            </SheetHeader>
            <div className="px-4">
              <Field orientation="horizontal">
                <Checkbox id="gallery-filter-mine" defaultChecked />
                <FieldLabel htmlFor="gallery-filter-mine">Assigned to me</FieldLabel>
              </Field>
            </div>
            <SheetFooter>
              <SheetClose asChild>
                <Button>Apply</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Open menu</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Project</DropdownMenuLabel>
            <DropdownMenuItem>Rename</DropdownMenuItem>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Open popover</Button>
          </PopoverTrigger>
          <PopoverContent>
            <PopoverHeader>
              <PopoverTitle>Due date</PopoverTitle>
              <PopoverDescription>Tasks past this date show as overdue.</PopoverDescription>
            </PopoverHeader>
          </PopoverContent>
        </Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Hover for a tooltip</Button>
          </TooltipTrigger>
          <TooltipContent>Shortcut: N</TooltipContent>
        </Tooltip>
        <Button variant="outline" onClick={() => toast.success("Task added")}>
          Show a toast
        </Button>
      </div>
    </Section>
  );
}
