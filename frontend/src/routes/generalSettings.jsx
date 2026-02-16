import { useAuth0 } from "@auth0/auth0-react"
import { LogOut } from "lucide-react"
import ThemeToggle from "../components/themeToggle"

const GeneralSettings = () => {
  const { logout } = useAuth0()

  return (
    <div className="w-full p-4 md:p-6 space-y-5">
      <div className="rounded-2xl border border-primary-border/30 bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-secondary">General Settings</p>
        <h2 className="mt-1 text-xl font-semibold text-primary-text">App Settings</h2>
        <p className="mt-1 text-sm text-secondary">
          Manage global preferences that apply across ranches.
        </p>
      </div>

      <div className="rounded-2xl border border-primary-border/30 bg-white p-5 shadow-sm">
        <div className="space-y-3">
          <div className="w-full rounded-xl border border-primary-border/30 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-primary-text">Theme</p>
                <p className="mt-0.5 text-xs text-secondary">Switch between light and dark mode.</p>
              </div>
              <ThemeToggle />
            </div>
          </div>

          <button
            type="button"
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            className="w-full rounded-xl border border-red-200 px-4 py-3 text-left transition-colors hover:bg-red-50"
          >
            <div className="inline-flex items-center gap-2">
              <LogOut className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm font-semibold text-red-700">Log out</p>
                <p className="mt-0.5 text-xs text-secondary">Close your session and return to login.</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default GeneralSettings
