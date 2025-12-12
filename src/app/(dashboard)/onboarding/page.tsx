"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitOnboarding } from "@/app/actions/onboarding";

type ServiceCategory = "mobile" | "internet" | "energy" | "insurance";

interface CategoryAnswers {
  mobile?: {
    current_provider: string;
    monthly_cost: string;
    data_gb: string;
  };
  internet?: {
    current_provider: string;
    monthly_cost: string;
  };
  energy?: {
    postal_code: string;
    current_provider: string;
    monthly_cost: string;
  };
  insurance?: Record<string, never>;
}

const CATEGORY_CONFIG: Record<
  ServiceCategory,
  { label: string; color: string; icon: string }
> = {
  mobile: {
    label: "Mobil",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700",
    icon: "📱",
  },
  internet: {
    label: "Internett",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300 dark:border-green-700",
    icon: "🌐",
  },
  energy: {
    label: "Strøm",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700",
    icon: "⚡",
  },
  insurance: {
    label: "Forsikring",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-700",
    icon: "🛡️",
  },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<ServiceCategory[]>([]);
  const [answers, setAnswers] = useState<CategoryAnswers>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentCategory = step > 0 ? selectedCategories[step - 1] : null;
  const totalSteps = selectedCategories.length + 1;
  const isLastStep = step === totalSteps - 1 && step > 0;

  const toggleCategory = (category: ServiceCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleNext = async () => {
    if (step === 0) {
      if (selectedCategories.length === 0) {
        setError("Velg minst én kategori");
        return;
      }
      setError(null);
      setStep(1);
      return;
    }

    if (isLastStep) {
      await handleSubmit();
      return;
    }

    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (step > 0) {
      setStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await submitOnboarding(selectedCategories, answers);
      if (result.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Noe gikk galt. Prøv igjen.");
      setIsSubmitting(false);
    }
  };

  const updateCategoryAnswers = <T extends ServiceCategory>(
    category: T,
    field: string,
    value: string
  ) => {
    setAnswers((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      },
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress indicator */}
        {step > 0 && (
          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
              <span>Steg {step} av {totalSteps - 1}</span>
              <span>{currentCategory && CATEGORY_CONFIG[currentCategory].label}</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${(step / (totalSteps - 1)) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          {step === 0 ? (
            <WelcomeStep
              selectedCategories={selectedCategories}
              toggleCategory={toggleCategory}
            />
          ) : currentCategory === "mobile" ? (
            <MobileStep
              answers={answers.mobile || { current_provider: "", monthly_cost: "", data_gb: "" }}
              updateAnswers={(field, value) => updateCategoryAnswers("mobile", field, value)}
            />
          ) : currentCategory === "internet" ? (
            <InternetStep
              answers={answers.internet || { current_provider: "", monthly_cost: "" }}
              updateAnswers={(field, value) => updateCategoryAnswers("internet", field, value)}
            />
          ) : currentCategory === "energy" ? (
            <EnergyStep
              answers={answers.energy || { postal_code: "", current_provider: "", monthly_cost: "" }}
              updateAnswers={(field, value) => updateCategoryAnswers("energy", field, value)}
            />
          ) : currentCategory === "insurance" ? (
            <InsuranceStep />
          ) : null}

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            {step > 0 && (
              <button
                onClick={handleBack}
                disabled={isSubmitting}
                className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Tilbake
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={isSubmitting || (step === 0 && selectedCategories.length === 0)}
              className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? "Sender..."
                : isLastStep
                ? "Fullfør"
                : "Neste"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WelcomeStep({
  selectedCategories,
  toggleCategory,
}: {
  selectedCategories: ServiceCategory[];
  toggleCategory: (category: ServiceCategory) => void;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Velkommen!
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Hva ønsker du tilbud på? Velg én eller flere kategorier.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {(Object.keys(CATEGORY_CONFIG) as ServiceCategory[]).map((category) => {
          const config = CATEGORY_CONFIG[category];
          const isSelected = selectedCategories.includes(category);

          return (
            <button
              key={category}
              onClick={() => toggleCategory(category)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? `${config.color} border-current`
                  : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
              }`}
            >
              <span className="text-2xl block mb-2">{config.icon}</span>
              <span className={`font-medium ${isSelected ? "" : "text-gray-900 dark:text-white"}`}>
                {config.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MobileStep({
  answers,
  updateAnswers,
}: {
  answers: { current_provider: string; monthly_cost: string; data_gb: string };
  updateAnswers: (field: string, value: string) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        📱 Mobil
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Fortell oss om ditt nåværende mobilabonnement.
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="mobile_provider" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Nåværende leverandør
          </label>
          <input
            type="text"
            id="mobile_provider"
            value={answers.current_provider}
            onChange={(e) => updateAnswers("current_provider", e.target.value)}
            placeholder="F.eks. Telenor, Telia, Ice"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="mobile_cost" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Månedlig kostnad (kr)
          </label>
          <input
            type="number"
            id="mobile_cost"
            value={answers.monthly_cost}
            onChange={(e) => updateAnswers("monthly_cost", e.target.value)}
            placeholder="F.eks. 399"
            min="0"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="mobile_data" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Data (GB per måned)
          </label>
          <input
            type="number"
            id="mobile_data"
            value={answers.data_gb}
            onChange={(e) => updateAnswers("data_gb", e.target.value)}
            placeholder="F.eks. 15"
            min="0"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>
    </div>
  );
}

function InternetStep({
  answers,
  updateAnswers,
}: {
  answers: { current_provider: string; monthly_cost: string };
  updateAnswers: (field: string, value: string) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        🌐 Internett
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Fortell oss om ditt nåværende internettabonnement.
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="internet_provider" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Nåværende leverandør
          </label>
          <input
            type="text"
            id="internet_provider"
            value={answers.current_provider}
            onChange={(e) => updateAnswers("current_provider", e.target.value)}
            placeholder="F.eks. Altibox, Telenor, Get"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="internet_cost" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Månedlig kostnad (kr)
          </label>
          <input
            type="number"
            id="internet_cost"
            value={answers.monthly_cost}
            onChange={(e) => updateAnswers("monthly_cost", e.target.value)}
            placeholder="F.eks. 599"
            min="0"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>
    </div>
  );
}

function EnergyStep({
  answers,
  updateAnswers,
}: {
  answers: { postal_code: string; current_provider: string; monthly_cost: string };
  updateAnswers: (field: string, value: string) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        ⚡ Strøm
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Fortell oss om din nåværende strømavtale.
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="energy_postal" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Postnummer
          </label>
          <input
            type="text"
            id="energy_postal"
            value={answers.postal_code}
            onChange={(e) => updateAnswers("postal_code", e.target.value)}
            placeholder="F.eks. 0150"
            maxLength={4}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="energy_provider" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Nåværende leverandør
          </label>
          <input
            type="text"
            id="energy_provider"
            value={answers.current_provider}
            onChange={(e) => updateAnswers("current_provider", e.target.value)}
            placeholder="F.eks. Tibber, Fjordkraft, Hafslund"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="energy_cost" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Gjennomsnittlig månedlig kostnad (kr)
          </label>
          <input
            type="number"
            id="energy_cost"
            value={answers.monthly_cost}
            onChange={(e) => updateAnswers("monthly_cost", e.target.value)}
            placeholder="F.eks. 1500"
            min="0"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>
    </div>
  );
}

function InsuranceStep() {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        🛡️ Forsikring
      </h2>
      <div className="py-8 text-center">
        <div className="text-4xl mb-4">🚧</div>
        <p className="text-gray-600 dark:text-gray-400">
          Forsikringstilbud kommer snart!
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
          Vi jobber med å legge til støtte for forsikring. Du vil få beskjed når dette er klart.
        </p>
      </div>
    </div>
  );
}
