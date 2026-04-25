import { useLocation } from "wouter";
import { TrashIcon, CameraIcon, ShieldCheck } from "lucide-react";

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="bg-emerald-600 text-white text-xs font-semibold px-3 py-1 rounded-full tracking-wide">
              SAN JOSE
            </span>
            <span className="text-sm text-gray-500">Community Services</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">City Services</h1>
          <p className="mt-2 text-sm text-gray-500">
            Select a service to get started.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => navigate("/report-dumping")}
            className="w-full flex items-center gap-4 bg-white border border-gray-200 rounded-2xl p-5 text-left shadow-sm hover:shadow-md hover:border-emerald-300 transition-all group"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
              <TrashIcon className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">Report Illegal Dumping</div>
              <div className="text-sm text-gray-500 mt-0.5">
                Report trash or debris dumped in public spaces
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate("/analyze-hazard")}
            className="w-full flex items-center gap-4 bg-white border border-gray-200 rounded-2xl p-5 text-left shadow-sm hover:shadow-md hover:border-blue-300 transition-all group"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <CameraIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">Analyze Photo</div>
              <div className="text-sm text-gray-500 mt-0.5">
                AI-powered bike lane hazard triage for staff
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate("/staff/login")}
            className="w-full flex items-center gap-4 bg-white border border-gray-200 rounded-2xl p-5 text-left shadow-sm hover:shadow-md hover:border-purple-300 transition-all group"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
              <ShieldCheck className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">Staff Portal</div>
              <div className="text-sm text-gray-500 mt-0.5">
                City staff only — view all submitted reports
              </div>
            </div>
          </button>
        </div>

        <p className="text-xs text-gray-400">
          Reports are reviewed within 1–2 business days.
        </p>
      </div>
    </div>
  );
}
