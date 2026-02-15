import { useEffect, useState } from "react"
import { createBreed, deleteBreed, getBreeds, updateBreed } from "../api/breeds"
import { useToken } from "../api/useToken"
import { useAppContext } from "../context"
import CreateButton from "../components/create"

const Breeds = () => {
  const token = useToken()
  const { showError, showSuccess, confirmAction } = useAppContext()
  const [breeds, setBreeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [name, setName] = useState("")
  const [editing, setEditing] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const isBusy = saving || deletingId !== null

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setBreeds([])
      return
    }
    const load = async () => {
      try {
        setLoading(true)
        setBreeds(await getBreeds(token))
      } catch (error) {
        showError(error?.response?.data?.message || "Could not load breeds.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token, showError])

  const refresh = async () => {
    if (!token) return
    setBreeds(await getBreeds(token))
  }

  const resetForm = () => {
    setName("")
    setEditing(null)
  }

  const shouldShowForm = breeds.length > 0 || showCreateForm || Boolean(editing)

  const handleShowCreate = () => {
    if (isBusy) return
    setShowCreateForm(true)
  }

  const handleCancel = () => {
    if (isBusy) return
    resetForm()
    if (breeds.length === 0) {
      setShowCreateForm(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!token || isBusy) return
    if (!name.trim()) {
      showError("Breed name is required.")
      return
    }

    try {
      setSaving(true)
      if (editing) {
        await updateBreed(editing.id, { name }, token)
        showSuccess("Breed updated.")
      } else {
        await createBreed({ name }, token)
        showSuccess("Breed created.")
        setShowCreateForm(true)
      }
      await refresh()
      resetForm()
    } catch (error) {
      showError(error?.response?.data?.message || "Could not save breed.")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item) => {
    if (isBusy) return
    setEditing(item)
    setName(item.name || "")
    setShowCreateForm(true)
  }

  const handleDelete = async (item) => {
    if (!token || isBusy) return
    const confirmed = await confirmAction({
      title: "Delete Breed",
      message: `Delete breed "${item.name}"?`,
      confirmText: "YES",
      cancelText: "NO",
    })
    if (!confirmed) return

    try {
      setDeletingId(item.id)
      await deleteBreed(item.id, token)
      showSuccess("Breed deleted.")
      if (editing?.id === item.id) resetForm()
      await refresh()
    } catch (error) {
      showError(error?.response?.data?.message || "Could not delete breed.")
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
            <h2 className="mt-1 text-xl font-semibold text-primary-text">Breeds</h2>
            <p className="mt-1 text-sm text-secondary">Standardized breed names used across all ranches.</p>
          </div>
          <div className="grid grid-cols-1 gap-2 w-full md:w-auto">
            <div className="rounded-xl border border-primary-border/20 bg-slate-50 px-3 py-2 min-w-[120px]">
              <p className="text-[11px] uppercase tracking-wide text-secondary">Total</p>
              <p className="text-lg font-semibold text-primary-text">{breeds.length}</p>
            </div>
          </div>
        </div>
      </div>

      {shouldShowForm && (
        <div className="rounded-2xl border border-primary-border/30 bg-white p-5 md:p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-primary-text">{editing ? "Edit Breed" : "Create Breed"}</h3>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:flex-row">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isBusy}
              className="w-full rounded-xl border border-primary-border/40 px-3 py-2 text-sm"
              placeholder="Breed name"
            />
            <button
              type="submit"
              disabled={isBusy}
              className="rounded-xl bg-action-blue px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : editing ? "Update" : "Add"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isBusy}
              className="rounded-xl border border-primary-border/40 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-primary-border/30 bg-white p-2 shadow-sm">
        {loading ? (
          <p className="p-4 text-sm text-secondary">Loading breeds...</p>
        ) : breeds.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-secondary">No breeds yet.</p>
            {!shouldShowForm && (
              <div className="mt-4 flex justify-center">
                <CreateButton text="Create first breed" onClick={handleShowCreate} />
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-primary-border/20">
            {breeds.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-3">
                <p className="text-sm text-primary-text">{item.name}</p>
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
    </div>
  )
}

export default Breeds
