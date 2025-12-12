"use client";

import { useState } from "react";
import { deleteService } from "@/app/actions/services";

interface Service {
  id: string;
  service_type: "mobile" | "internet" | "energy";
  current_provider: string;
  monthly_cost: number;
  postal_code: string;
  created_at: string;
}

const serviceTypeLabels: Record<Service["service_type"], string> = {
  mobile: "Mobile",
  internet: "Internet",
  energy: "Energy",
};

const serviceTypeColors: Record<Service["service_type"], string> = {
  mobile: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  internet: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  energy: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

export function ServicesList({ services }: { services: Service[] }) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service?")) {
      return;
    }

    setDeletingId(id);
    await deleteService(id);
    setDeletingId(null);
  };

  if (services.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <p className="text-gray-500 dark:text-gray-400 text-center">
          No services added yet. Add your first service to start receiving offers.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
      {services.map((service) => (
        <div key={service.id} className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    serviceTypeColors[service.service_type]
                  }`}
                >
                  {serviceTypeLabels[service.service_type]}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {service.current_provider}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {(service.monthly_cost / 100).toFixed(2)} NOK/month
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Postal code: {service.postal_code}
              </p>
            </div>
            <button
              onClick={() => handleDelete(service.id)}
              disabled={deletingId === service.id}
              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm disabled:opacity-50"
            >
              {deletingId === service.id ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
