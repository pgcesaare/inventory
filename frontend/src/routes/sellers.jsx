import { useEffect, useMemo, useState } from "react"
import { X } from "lucide-react"
import { createSeller, deleteSeller, getSellers, updateSeller } from "../api/sellers"
import { useToken } from "../api/useToken"
import { useAppContext } from "../context"
import CreateButton from "../components/create"

const emptyForm = {
  name: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
}

const Sellers = () => {
  const token = useToken()
  const { showError, showSuccess, confirmAction } = useAppContext()
  const [sellers, setSellers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [showFormModal, setShowFormModal] = useState(false)
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const isBusy = saving || deletingId !== null

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setSellers([])
      return
    }
    const load = async () => {
      try {
        setLoading(true)
        setSellers(await getSellers(token))
      } catch (error) {
        showError(error?.response?.data?.message || "Could not load sellers.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token, showError])

  const refresh = async () => {
    if (!token) return
    setSellers(await getSellers(token))
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditing(null)
    setErrors({})
  }

  const onChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const sellersWithAddress = useMemo(
    () => sellers.filter((item) => Boolean([item.address, item.city, item.state, item.zipCode || item.zip_code].find(Boolean))).length,
    [sellers]
  )

  const validate = () => {
    const nextErrors = {}
    if (!form.name.trim()) {
      nextErrors.name = "Name is required."
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const closeModal = () => {
    if (saving) return
    setShowFormModal(false)
    resetForm()
  }

  const handleCreate = () => {
    if (isBusy) return
    resetForm()
    setShowFormModal(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!token || isBusy) return
    if (!validate()) {
      return
    }

    try {
      setSaving(true)
      if (editing) {
        await updateSeller(editing.id, form, token)
        showSuccess("Seller updated.")
      } else {
        await createSeller(form, token)
        showSuccess("Seller created.")
      }
      await refresh()
      resetForm()
      setShowFormModal(false)
    } catch (error) {
      showError(error?.response?.data?.message || "Could not save seller.")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item) => {
    if (isBusy) return
    setEditing(item)
    setForm({
      name: item.name || "",
      address: item.address || "",
      city: item.city || "",
      state: item.state || "",
      zipCode: item.zipCode || item.zip_code || "",
    })
    setErrors({})
    setShowFormModal(true)
  }

  const handleDelete = async (item) => {
    if (!token || isBusy) return
    const confirmed = await confirmAction({
      title: "Delete Seller",
      message: `Delete seller "${item.name}"?`,
      confirmText: "YES",
      cancelText: "NO",
    })
    if (!confirmed) return

    try {
      setDeletingId(item.id)
      await deleteSeller(item.id, token)
      showSuccess("Seller deleted.")
      if (editing?.id === item.id) resetForm()
      await refresh()
    } catch (error) {
      showError(error?.response?.data?.message || "Could not delete seller.")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="w-full p-4 md:p-6 space-y-5">
      <div className="rounded-2xl border border-primary-border/30 bg-white p-5 md:p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-secondary">Catalog</p>
            <h2 className="mt-1 text-xl font-semibold text-primary-text">Sellers</h2>
            <p className="mt-1 text-sm text-secondary">Standardized sellers for all ranches.</p>
          </div>
          <div className="ml-auto grid grid-cols-1 gap-2 w-auto">
            <div className="rounded-xl border border-primary-border/20 bg-slate-50 px-3 py-2 min-w-[120px]">
              <p className="text-[11px] uppercase tracking-wide text-secondary">Total</p>
              <p className="text-lg font-semibold text-primary-text">{sellers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {sellers.length > 0 && (
        <div className="rounded-2xl border border-primary-border/30 bg-white p-4 md:p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-primary-text">Create Seller</h3>
            <CreateButton text="New Seller" onClick={handleCreate} />
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-primary-border/30 bg-white p-2 shadow-sm">
        {loading ? (
          <p className="p-4 text-sm text-secondary">Loading sellers...</p>
        ) : sellers.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-secondary">No sellers yet.</p>
            <div className="mt-4 flex justify-center">
              <CreateButton text="Create first seller" onClick={handleCreate} />
            </div>
          </div>
        ) : (
          <div className="divide-y divide-primary-border/20">
            {sellers.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 px-3 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-primary-text">{item.name}</p>
                  <p className="text-xs text-secondary">
                    {[item.address, item.city, item.state, item.zipCode || item.zip_code].filter(Boolean).join(", ") || "No address"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(item)}
                    disabled={isBusy}
                    className="rounded-lg border border-primary-border/40 px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    disabled={isBusy}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingId === item.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showFormModal && (
        <div className="fixed inset-0 z-60 bg-black/50" onMouseDown={closeModal}>
          <div
            className="fixed inset-0 m-auto h-fit w-[92%] max-w-2xl rounded-xl bg-white p-4 shadow-xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-primary-border/30 p-2">
              <h3 className="text-base font-bold text-primary-text">{editing ? "Edit Seller" : "Create New Seller"}</h3>
              <button
                type="button"
                className="cursor-pointer rounded-md p-1 text-secondary hover:bg-primary-border/20"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-3">
              <div className="flex flex-col gap-1">
                <h4 className="text-sm font-semibold text-primary-text">Seller Information</h4>
                <p className="text-xs text-secondary opacity-80">Fill in seller details to standardize records across ranches.</p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-secondary">Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => onChange("name", e.target.value)}
                    disabled={isBusy}
                    className="w-full rounded-xl border border-primary-border/40 px-3 py-2 text-sm"
                    placeholder="Enter seller name"
                  />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-secondary">Address</label>
                  <input
                    value={form.address}
                    onChange={(e) => onChange("address", e.target.value)}
                    disabled={isBusy}
                    className="w-full rounded-xl border border-primary-border/40 px-3 py-2 text-sm"
                    placeholder="Enter seller address"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-secondary">City</label>
                  <input
                    value={form.city}
                    onChange={(e) => onChange("city", e.target.value)}
                    disabled={isBusy}
                    className="w-full rounded-xl border border-primary-border/40 px-3 py-2 text-sm"
                    placeholder="Enter city"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-secondary">State</label>
                  <input
                    value={form.state}
                    onChange={(e) => onChange("state", e.target.value)}
                    disabled={isBusy}
                    className="w-full rounded-xl border border-primary-border/40 px-3 py-2 text-sm"
                    placeholder="Enter state"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-secondary">Zip Code</label>
                  <input
                    value={form.zipCode}
                    onChange={(e) => onChange("zipCode", e.target.value)}
                    disabled={isBusy}
                    className="w-full rounded-xl border border-primary-border/40 px-3 py-2 text-sm"
                    placeholder="Enter zip code"
                  />
                </div>
              </div>

              <div className="mt-2 flex justify-end gap-3 border-t border-primary-border/30 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg bg-gray-300 px-5 py-2 text-sm font-bold text-black hover:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : editing ? "Update Seller" : "Create Seller"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sellers
