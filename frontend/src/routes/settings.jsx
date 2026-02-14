import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { useToken } from "../api/useToken"
import { getRanchById, updateRanch } from "../api/ranches"
import { useAppContext } from "../context"
import { DEFAULT_WEIGHT_CATEGORIES, createWeightCategory, normalizeWeightCategories } from "../utils/weightCategories"
import { RanchPageSkeleton } from "../components/shared/loadingSkeletons"

const Settings = () => {
  const { id } = useParams()
  const token = useToken()
  const { ranch, setRanch, setRanches, showSuccess, showError } = useAppContext()
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState(DEFAULT_WEIGHT_CATEGORIES)
  const [selectedSetting, setSelectedSetting] = useState(null)

  useEffect(() => {
    if (!token || !id) return
    if (ranch?.id === Number(id)) {
      setCategories(normalizeWeightCategories(ranch?.weightCategories))
      return
    }

    const fetchRanch = async () => {
      try {
        const data = await getRanchById(id, token)
        setRanch(data)
        setCategories(normalizeWeightCategories(data?.weightCategories))
      } catch (error) {
        console.error("Error loading ranch settings:", error)
      }
    }

    fetchRanch()
  }, [id, token, ranch?.id, ranch?.weightCategories, setRanch])

  const hasChanges = useMemo(() => {
    const baseline = JSON.stringify(normalizeWeightCategories(ranch?.weightCategories))
    const current = JSON.stringify(normalizeWeightCategories(categories))
    return baseline !== current
  }, [ranch?.weightCategories, categories])

  const setField = (index, key, value) => {
    setCategories((prev) => prev.map((item, idx) => (
      idx === index
        ? { ...item, [key]: key === "min" || key === "max" ? (value === "" ? null : Number(value)) : value }
        : item
    )))
  }
  const addCategory = () => {
    setCategories((prev) => [...prev, createWeightCategory(prev.length)])
  }
  const removeCategory = (index) => {
    setCategories((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleSave = async () => {
    if (!token || !ranch?.id || saving) return
    try {
      setSaving(true)
      const payload = { weightCategories: normalizeWeightCategories(categories) }
      const updated = await updateRanch(ranch.id, payload, token)

      setRanch((prev) => ({ ...(prev || {}), ...updated }))
      setRanches((prev) => Array.isArray(prev)
        ? prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
        : prev
      )
      showSuccess("Weight categories updated successfully.", "Saved")
    } catch (error) {
      console.error("Error saving ranch settings:", error)
      showError(error?.response?.data?.message || "Could not save ranch settings.")
    } finally {
      setSaving(false)
    }
  }

  if (!ranch) return <RanchPageSkeleton />

  const settingOptions = [
    {
      key: "weight-categories",
      title: "Weight Categories",
      description: "Set the bracket ranges and labels used in this ranch.",
    },
  ]
  const breadcrumbCurrent = selectedSetting === "weight-categories" ? "Weight Categories" : ""

  return (
    <div className="w-full p-4 md:p-6 space-y-5">
      {selectedSetting && (
        <div className="flex items-center gap-2 text-xs text-secondary">
          <button
            type="button"
            onClick={() => setSelectedSetting(null)}
            className="transition-colors hover:text-primary-text"
          >
            Settings
          </button>
          <span>/</span>
          <span className="text-primary-text">{breadcrumbCurrent}</span>
        </div>
      )}

      <div className="rounded-2xl border border-primary-border/30 bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-secondary">Settings</p>
        <h2 className="mt-1 text-xl font-semibold text-primary-text">{ranch.name} Settings</h2>
        <p className="mt-1 text-sm text-secondary">
          Manage settings for this ranch from the list below.
        </p>
      </div>

      {!selectedSetting && (
        <div className="rounded-2xl border border-primary-border/30 bg-white p-5 shadow-sm">
          <div className="space-y-3">
            {settingOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setSelectedSetting(option.key)}
                className="w-full rounded-xl border border-primary-border/30 px-4 py-3 text-left transition-colors hover:bg-primary-border/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-primary-text">{option.title}</p>
                    <p className="mt-0.5 text-xs text-secondary">{option.description}</p>
                  </div>
                  <span className="text-xs font-semibold text-secondary">Open</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedSetting === "weight-categories" && (
        <div className="rounded-2xl border border-primary-border/30 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-primary-text">Weight Categories</h3>
              <p className="text-xs text-secondary">Configure weight range and description by category.</p>
            </div>
            <button
              type="button"
              onClick={addCategory}
              className="rounded-lg border border-primary-border/40 px-3 py-1.5 text-xs hover:bg-primary-border/10"
            >
              Add Category
            </button>
          </div>

          {categories.length === 0 && (
            <div className="rounded-xl border border-dashed border-primary-border/40 p-4 text-sm text-secondary">
              No categories yet. Click <span className="font-semibold text-primary-text">Add Category</span> to create one.
            </div>
          )}

          {categories.map((category, index) => (
            <div key={category.key || `category-${index}`} className="rounded-xl border border-primary-border/20 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-secondary uppercase tracking-wide">Category {index + 1}</p>
                <button
                  type="button"
                  onClick={() => removeCategory(index)}
                  className="rounded-md border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-secondary">Label</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-primary-border/40 px-3 py-2 text-sm"
                    value={category.label || ""}
                    onChange={(e) => setField(index, "label", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-secondary">Description</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-primary-border/40 px-3 py-2 text-sm"
                    value={category.description || ""}
                    onChange={(e) => setField(index, "description", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-secondary">Min Weight (lb)</label>
                  <input
                    type="number"
                    className="mt-1 w-full rounded-lg border border-primary-border/40 px-3 py-2 text-sm"
                    value={category.min ?? ""}
                    onChange={(e) => setField(index, "min", e.target.value)}
                    placeholder="No minimum"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-secondary">Max Weight (lb)</label>
                  <input
                    type="number"
                    className="mt-1 w-full rounded-lg border border-primary-border/40 px-3 py-2 text-sm"
                    value={category.max ?? ""}
                    onChange={(e) => setField(index, "max", e.target.value)}
                    placeholder="No maximum"
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between gap-3 border-t border-primary-border/20 pt-3">
            <button
              type="button"
              onClick={() => setSelectedSetting(null)}
              className="rounded-lg border border-primary-border/40 px-3 py-1.5 text-xs hover:bg-primary-border/10"
            >
              Back to options
            </button>
            <button
              type="button"
              disabled={saving || !hasChanges}
              onClick={handleSave}
              className="rounded-xl border border-action-blue/80 bg-action-blue px-4 py-2 text-sm font-medium text-white hover:bg-action-blue/90 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings
