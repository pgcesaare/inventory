import { useEffect, useState } from "react"
import { X } from "lucide-react"

const formatDateInput = (value) => {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}

const calculateDaysOnFeed = (calf) => {
  if (!calf) return "-"

  const startValue = calf.dateIn || calf.placedDate
  const start = startValue ? new Date(startValue) : null
  const rawPre = Number(calf.preDaysOnFeed || 0)
  const preDays = Number.isFinite(rawPre) ? Math.max(0, rawPre) : 0

  if (!start || Number.isNaN(start.getTime())) return preDays

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const placedDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const diff = Math.floor((today.getTime() - placedDay.getTime()) / (1000 * 60 * 60 * 24))
  const elapsed = Math.max(0, diff) + 1
  return elapsed + preDays
}

const CalfEditModal = ({ calf, onClose, onSave, onDelete, loading = false }) => {
  const [form, setForm] = useState({
    primaryID: "",
    EID: "",
    backTag: "",
    dateIn: "",
    breed: "",
    sex: "bull",
    weight: "",
    purchasePrice: "",
    sellPrice: "",
    seller: "",
    dairy: "",
    status: "feeding",
    proteinLevel: "",
    proteinTest: "pending",
    deathDate: "",
    shippedOutDate: "",
    shippedTo: "",
    preDaysOnFeed: "0",
  })

  useEffect(() => {
    if (!calf) return
    setForm({
      primaryID: calf.primaryID || "",
      EID: calf.EID || "",
      backTag: calf.backTag || calf.originalID || "",
      dateIn: formatDateInput(calf.dateIn || calf.placedDate),
      breed: calf.breed || "",
      sex: calf.sex || "bull",
      weight: calf.weight ?? "",
      purchasePrice: calf.purchasePrice ?? calf.price ?? "",
      sellPrice: calf.sellPrice ?? "",
      seller: calf.seller || "",
      dairy: calf.dairy || "",
      status: calf.status || "feeding",
      proteinLevel: calf.proteinLevel ?? "",
      proteinTest: calf.proteinTest || "pending",
      deathDate: formatDateInput(calf.deathDate),
      shippedOutDate: formatDateInput(calf.shippedOutDate),
      shippedTo: calf.shippedTo || "",
      preDaysOnFeed: calf.preDaysOnFeed ?? 0,
    })
  }, [calf])

  if (!calf) return null

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const submit = async (event) => {
    event.preventDefault()
    await onSave(form)
  }

  const fieldClass = "w-full rounded-md border border-primary-border/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-border"

  return (
    <div className="fixed inset-0 z-[80] bg-black/50" onMouseDown={onClose}>
      <div
        className="fixed inset-0 m-auto h-fit max-h-[90vh] w-[96%] max-w-4xl overflow-y-auto rounded-xl bg-white p-4"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-primary-border/30 p-2">
          <h3 className="text-base font-bold text-primary-text">Edit Calf</h3>
          <button type="button" onClick={onClose} className="cursor-pointer p-2 rounded-full hover:bg-primary-border/10">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="p-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="text-xs font-semibold text-secondary">Visual Tag</label><input className={fieldClass} value={form.primaryID} onChange={(e) => setField("primaryID", e.target.value)} /></div>
          <div><label className="text-xs font-semibold text-secondary">EID</label><input className={fieldClass} value={form.EID} onChange={(e) => setField("EID", e.target.value)} /></div>
          <div><label className="text-xs font-semibold text-secondary">Back Tag</label><input className={fieldClass} value={form.backTag} onChange={(e) => setField("backTag", e.target.value)} /></div>
          <div><label className="text-xs font-semibold text-secondary">Date In</label><input type="date" className={fieldClass} value={form.dateIn} onChange={(e) => setField("dateIn", e.target.value)} /></div>
          <div><label className="text-xs font-semibold text-secondary">Breed</label><input className={fieldClass} value={form.breed} onChange={(e) => setField("breed", e.target.value)} /></div>
          <div><label className="text-xs font-semibold text-secondary">Sex</label><input className={fieldClass} value={form.sex} onChange={(e) => setField("sex", e.target.value)} /></div>
          <div><label className="text-xs font-semibold text-secondary">Weight</label><input className={fieldClass} value={form.weight} onChange={(e) => setField("weight", e.target.value)} /></div>
          <div><label className="text-xs font-semibold text-secondary">Purchase Price</label><input className={fieldClass} value={form.purchasePrice} onChange={(e) => setField("purchasePrice", e.target.value)} /></div>
          <div><label className="text-xs font-semibold text-secondary">Sell Price</label><input className={fieldClass} value={form.sellPrice} onChange={(e) => setField("sellPrice", e.target.value)} /></div>
          <div><label className="text-xs font-semibold text-secondary">Seller</label><input className={fieldClass} value={form.seller} onChange={(e) => setField("seller", e.target.value)} /></div>
          <div><label className="text-xs font-semibold text-secondary">Dairy</label><input className={fieldClass} value={form.dairy} onChange={(e) => setField("dairy", e.target.value)} /></div>
          <div><label className="text-xs font-semibold text-secondary">Status</label><input className={fieldClass} value={form.status} onChange={(e) => setField("status", e.target.value)} /></div>
          <div><label className="text-xs font-semibold text-secondary">Protein Level</label><input className={fieldClass} value={form.proteinLevel} onChange={(e) => setField("proteinLevel", e.target.value)} /></div>
          <div><label className="text-xs font-semibold text-secondary">Protein Test</label><input className={fieldClass} value={form.proteinTest} onChange={(e) => setField("proteinTest", e.target.value)} /></div>
          <div><label className="text-xs font-semibold text-secondary">Death Date</label><input type="date" className={fieldClass} value={form.deathDate} onChange={(e) => setField("deathDate", e.target.value)} /></div>
          <div><label className="text-xs font-semibold text-secondary">Shipped Out Date</label><input type="date" className={fieldClass} value={form.shippedOutDate} onChange={(e) => setField("shippedOutDate", e.target.value)} /></div>
          <div><label className="text-xs font-semibold text-secondary">Shipped To</label><input className={fieldClass} value={form.shippedTo} onChange={(e) => setField("shippedTo", e.target.value)} /></div>
          <div><label className="text-xs font-semibold text-secondary">Pre-Days-On-Feed</label><input className={fieldClass} value={form.preDaysOnFeed} onChange={(e) => setField("preDaysOnFeed", e.target.value)} /></div>
          <div><label className="text-xs font-semibold text-secondary">Days On Feed (calculated)</label><input className={`${fieldClass} bg-primary-border/10`} value={calculateDaysOnFeed({ ...calf, preDaysOnFeed: form.preDaysOnFeed })} readOnly disabled /></div>

          <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-primary-border/30">
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="px-4 py-2 rounded-md border border-red-300 text-sm text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            )}
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border border-primary-border/40 text-sm text-primary-text hover:bg-primary-border/10">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-md border border-action-blue/80 bg-action-blue text-sm text-white hover:bg-action-blue/90 disabled:opacity-60">
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CalfEditModal
