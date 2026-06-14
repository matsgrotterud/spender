"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export const COOKIE_CONSENT_VERSION = "2026-06-v1";

interface CookiePreferences {
  necessary: true;
  analytics: boolean;
}

function readStoredPreferences(): { prefs: CookiePreferences; version: string } | null {
  try {
    const raw = localStorage.getItem("spender-cookie-consent");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Cookie consent banner. Only strictly necessary cookies (session) are used
 * without consent; analytics events for anonymous visitors require opt-in.
 * The choice is persisted locally and recorded server-side for accountability.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    const stored = readStoredPreferences();
    if (!stored || stored.version !== COOKIE_CONSENT_VERSION) {
      setVisible(true);
    }
  }, []);

  const save = async (prefs: CookiePreferences) => {
    localStorage.setItem(
      "spender-cookie-consent",
      JSON.stringify({ prefs, version: COOKIE_CONSENT_VERSION }),
    );
    setVisible(false);
    try {
      await fetch("/api/cookie-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: prefs, consentVersion: COOKIE_CONSENT_VERSION }),
      });
    } catch {
      // local storage is the source of truth for the browser
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-card p-4 shadow-lg">
      <div className="container max-w-4xl space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Informasjonskapsler</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Spender bruker kun nødvendige informasjonskapsler for innlogging. Vi sporer deg ikke
            på tvers av nettsteder. Du kan i tillegg tillate anonym bruksstatistikk som hjelper
            oss å forbedre tjenesten.
          </p>
        </div>

        {showDetails && (
          <div className="space-y-2 rounded-md border bg-background p-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked disabled className="h-4 w-4" />
              <span>
                <strong>Nødvendige</strong> – innlogging og sikkerhet (kan ikke slås av)
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="h-4 w-4"
              />
              <span>
                <strong>Statistikk</strong> – anonym bruksstatistikk uten kryssporing
              </span>
            </label>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => save({ necessary: true, analytics: true })}>
            Godta alle
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => save({ necessary: true, analytics: showDetails ? analytics : false })}
          >
            {showDetails ? "Lagre valg" : "Kun nødvendige"}
          </Button>
          {!showDetails && (
            <Button size="sm" variant="ghost" onClick={() => setShowDetails(true)}>
              Tilpass
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
