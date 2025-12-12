"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteUserRequest } from "@/app/actions/onboarding";

interface UserRequest {
  id: string;
  service_type: string;
  postal_code: string | null;
  answers: Record<string, unknown>;
  created_at: string;
}

const SERVICE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  mobile: {
    label: "Mobil",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    icon: "📱",
  },
  internet: {
    label: "Internett",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    icon: "🌐",
  },
  energy: {
    label: "Strøm",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    icon: "⚡",
  },
  insurance: {
    label: "Forsikring",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    icon: "🛡️",
  },
};

export function RequestsList({ requests }: { requests: UserRequest[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Er du sikker på at du vil slette denne forespørselen?")) {
      return;
    }

    setDeletingId(id);
    const result = await deleteUserRequest(id);

    if (result.error) {
      alert(result.error);
    } else {
      router.refresh();
    }

    setDeletingId(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("nb-NO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatAnswers = (answers: Record<string, unknown>, serviceType: string) => {
    const items: string[] = [];

    if (answers.current_provider) {
      items.push(`Leverandør: ${answers.current_provider}`);
    }
    if (answers.monthly_cost) {
      items.push(`${answers.monthly_cost} kr/mnd`);
    }
    if (serviceType === "mobile" && answers.data_gb) {
      items.push(`${answers.data_gb} GB`);
    }

    return items;
  };

  if (requests.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 text-center text-gray-500 dark:text-gray-400">
        <p>Ingen forespørsler ennå.</p>
        <p className="text-sm mt-2">
          Fullfør onboarding for å opprette forespørsler.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
      {requests.map((request) => {
        const config = SERVICE_CONFIG[request.service_type] || {
          label: request.service_type,
          color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
          icon: "📋",
        };

        const answerItems = formatAnswers(request.answers, request.service_type);

        return (
          <div key={request.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <span className="text-xl">{config.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
                    >
                      {config.label}
                    </span>
                    {request.postal_code && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        📍 {request.postal_code}
                      </span>
                    )}
                  </div>

                  {answerItems.length > 0 && (
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {answerItems.join(" • ")}
                    </div>
                  )}

                  <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    Opprettet {formatDate(request.created_at)}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDelete(request.id)}
                disabled={deletingId === request.id}
                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm disabled:opacity-50"
              >
                {deletingId === request.id ? "Sletter..." : "Slett"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
