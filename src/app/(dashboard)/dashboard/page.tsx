import { redirect } from "next/navigation";
import { checkOnboardingStatus, getUserRequests } from "@/app/actions/onboarding";
import { RequestsList } from "./requests-list";
import { InboxSection } from "./inbox-section";

export default async function DashboardPage() {
  const { completed } = await checkOnboardingStatus();

  if (!completed) {
    redirect("/onboarding");
  }

  const { requests } = await getUserRequests();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Se tilbud og administrer dine forespørsler.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Innboks
          </h3>
          <InboxSection />
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Dine forespørsler
          </h3>
          <RequestsList requests={requests} />
        </div>
      </div>
    </div>
  );
}
