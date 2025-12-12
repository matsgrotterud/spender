"use client";

import { useState } from "react";
import { createService, type ServiceType } from "@/app/actions/services";

export function AddServiceForm() {
  const [serviceType, setServiceType] = useState<ServiceType>("mobile");
  const [currentProvider, setCurrentProvider] = useState("");
  const [monthlyCost, setMonthlyCost] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const cost = parseFloat(monthlyCost);
    if (isNaN(cost) || cost <= 0) {
      setError("Please enter a valid monthly cost");
      setLoading(false);
      return;
    }

    if (postalCode.length < 4) {
      setError("Please enter a valid postal code");
      setLoading(false);
      return;
    }

    const result = await createService({
      service_type: serviceType,
      current_provider: currentProvider,
      monthly_cost: cost,
      postal_code: postalCode,
    });

    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccess(true);
    setCurrentProvider("");
    setMonthlyCost("");
    setPostalCode("");
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-4"
    >
      {error && (
        <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-200 px-4 py-3 rounded-md text-sm">
          Service added successfully!
        </div>
      )}

      <div>
        <label
          htmlFor="serviceType"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Service Type
        </label>
        <select
          id="serviceType"
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value as ServiceType)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="mobile">Mobile</option>
          <option value="internet">Internet</option>
          <option value="energy">Energy</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="currentProvider"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Current Provider
        </label>
        <input
          id="currentProvider"
          type="text"
          required
          value={currentProvider}
          onChange={(e) => setCurrentProvider(e.target.value)}
          placeholder="e.g., Telenor, Telia, Tibber"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div>
        <label
          htmlFor="monthlyCost"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Monthly Cost (NOK)
        </label>
        <input
          id="monthlyCost"
          type="number"
          step="0.01"
          min="0"
          required
          value={monthlyCost}
          onChange={(e) => setMonthlyCost(e.target.value)}
          placeholder="e.g., 399"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div>
        <label
          htmlFor="postalCode"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Postal Code
        </label>
        <input
          id="postalCode"
          type="text"
          required
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          placeholder="e.g., 0150"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Adding..." : "Add Service"}
      </button>
    </form>
  );
}
