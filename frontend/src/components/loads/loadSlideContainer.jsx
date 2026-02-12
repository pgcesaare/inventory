import { X } from "lucide-react"

const LoadSlideContainer = ({ title, children, onClose }) => {
  return (
    <div className="sticky top-0 z-40 flex h-full w-full flex-col bg-surface">
      <div className="flex items-center justify-between border-b border-primary-border/30 bg-surface/90 p-4 backdrop-blur-sm">
        <h2 className="text-lg font-semibold text-primary-text">{title}</h2>
        <button
          type="button"
          className="cursor-pointer rounded-full p-1.5 text-secondary hover:bg-primary-border/15 hover:text-primary-text"
          onClick={onClose}
        >
          <X className="size-5" />
        </button>
      </div>
      {children}
    </div>
  )
}

export default LoadSlideContainer
