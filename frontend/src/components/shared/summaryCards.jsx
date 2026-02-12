import React from "react"

const SummaryCards = ({ items = [] }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-primary-border/30 bg-white shadow-sm p-4"
        >
          <p className="text-xs uppercase tracking-wide text-secondary opacity-80">
            {item.label}
          </p>
          <p className="mt-2 text-2xl font-bold text-primary-text">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  )
}

export default SummaryCards
