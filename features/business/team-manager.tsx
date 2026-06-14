"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addTeamMember, removeTeamMember } from "@/features/business/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { UserPlus, UserMinus } from "lucide-react";

interface MemberItem {
  userId: string;
  email: string;
  role: string;
  lastLoginAt: string | null;
  joinedAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Eier",
  ADMIN: "Administrator",
  MEMBER: "Medlem",
  VIEWER: "Leser",
};

export function TeamManager({
  members,
  canManage,
  currentUserId,
  maxSeats,
}: {
  members: MemberItem[];
  canManage: boolean;
  currentUserId: string;
  maxSeats: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const seatsLeft = maxSeats - members.length;

  async function onAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const formData = new FormData(event.currentTarget);
    const result = await addTeamMember({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      role: String(formData.get("role") ?? "MEMBER") as "ADMIN" | "MEMBER" | "VIEWER",
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Kunne ikke legge til medlem");
      return;
    }
    setInfo("Medlem lagt til. Del innloggingsdetaljene med vedkommende på en sikker måte.");
    (event.target as HTMLFormElement).reset?.();
    router.refresh();
  }

  async function onRemove(userId: string, email: string) {
    if (!window.confirm(`Fjerne ${email} fra teamet?`)) return;
    setLoading(true);
    const result = await removeTeamMember(userId);
    setLoading(false);
    if (!result.ok) setError(result.error ?? "Kunne ikke fjerne medlem");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {info && (
        <Alert variant="success">
          <AlertDescription>{info}</AlertDescription>
        </Alert>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-post</TableHead>
              <TableHead>Rolle</TableHead>
              <TableHead>Sist innlogget</TableHead>
              <TableHead>Medlem siden</TableHead>
              {canManage && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.userId}>
                <TableCell className="font-medium">
                  {member.email}
                  {member.userId === currentUserId && (
                    <span className="ml-2 text-xs text-muted-foreground">(deg)</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={member.role === "OWNER" ? "default" : "secondary"}>
                    {ROLE_LABELS[member.role] ?? member.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {member.lastLoginAt ? formatDate(new Date(member.lastLoginAt)) : "Aldri"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(new Date(member.joinedAt))}
                </TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    {member.role !== "OWNER" && member.userId !== currentUserId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={loading}
                        onClick={() => onRemove(member.userId, member.email)}
                      >
                        <UserMinus className="h-4 w-4" aria-hidden /> Fjern
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4" aria-hidden /> Legg til medlem
            </CardTitle>
            <CardDescription>
              {seatsLeft > 0
                ? `${seatsLeft} ledige plasser på planen.`
                : "Planen er full. Oppgrader under Betaling for flere plasser."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onAdd} className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="memberEmail">E-post</Label>
                <Input id="memberEmail" name="email" type="email" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="memberPassword">Midlertidig passord</Label>
                <Input id="memberPassword" name="password" type="text" required minLength={8} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="memberRole">Rolle</Label>
                <Select id="memberRole" name="role" defaultValue="MEMBER">
                  <option value="ADMIN">Administrator</option>
                  <option value="MEMBER">Medlem</option>
                  <option value="VIEWER">Leser</option>
                </Select>
              </div>
              <div className="sm:col-span-4">
                <Button type="submit" disabled={loading || seatsLeft <= 0}>
                  {loading ? "Legger til …" : "Legg til"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
