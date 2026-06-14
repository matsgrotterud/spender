import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { decryptJson } from "@/lib/encryption";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PrivacyBadge } from "@/components/privacy/privacy-badge";
import { ContactDetailsForm } from "@/features/consumer/contact-details-form";

interface PrivateProfilePayload {
  fullName?: string;
  phone?: string;
  address?: string;
}

export default async function ProfilePage() {
  const user = await requireUser(["CONSUMER"]);
  const [consumerProfile, privateProfile] = await Promise.all([
    db.consumerProfile.findUnique({ where: { userId: user.id } }),
    db.userPrivateProfile.findUnique({ where: { userId: user.id } }),
  ]);

  const contact: PrivateProfilePayload = privateProfile
    ? decryptJson<PrivateProfilePayload>(privateProfile.encryptedPayload)
    : {};

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profil</h1>
        <p className="text-sm text-muted-foreground">Kontoinformasjon og kontaktdetaljer.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pseudonymet ditt</CardTitle>
          <CardDescription>Dette er alt bedrifter ser om deg som person.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-md border bg-muted/50 p-4">
            <p className="text-lg font-semibold">{consumerProfile?.displayAlias}</p>
            <PrivacyBadge level="public" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Innlogging: <strong>{user.email}</strong>{" "}
            <span className="text-xs">(aldri synlig for bedrifter uten samtykke)</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Kontaktdetaljer</CardTitle>
            <PrivacyBadge level="private" />
          </div>
          <CardDescription>
            Lagres kryptert. Brukes kun når du selv velger å dele kontaktinfo med en bedrift.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContactDetailsForm
            defaultValues={{
              fullName: contact.fullName ?? "",
              phone: contact.phone ?? "",
              address: contact.address ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
