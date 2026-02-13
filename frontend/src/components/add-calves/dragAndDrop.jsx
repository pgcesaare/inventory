import React, { useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { FileSpreadsheet, UploadCloud } from "lucide-react"

const DragAndDrop = ({ onFileSelect, selectedFile, disabled = false }) => {
  const onDrop = useCallback(
    (acceptedFiles) => {
      if (disabled || acceptedFiles.length === 0) return
      onFileSelect(acceptedFiles[0])
    },
    [disabled, onFileSelect]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    disabled,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
  })

  return (
    <div
      {...getRootProps()}
      className={`
        w-full rounded-2xl border-2 border-dashed p-8
        transition-colors cursor-pointer
        ${isDragActive ? "border-action-blue bg-action-blue/5" : "border-primary-border/40 bg-white"}
        ${disabled ? "opacity-60 cursor-not-allowed" : ""}
      `}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <UploadCloud className="h-8 w-8 text-action-blue" />
        <p className="text-sm font-semibold text-primary-text">
          Drag and drop your Excel file here
        </p>
        <p className="text-xs text-secondary">
          or click to select a file (`.xlsx` or `.xls`)
        </p>

        {selectedFile && (
          <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-lg border border-primary-border/40 px-3 py-1.5 text-xs text-primary-text">
            <FileSpreadsheet className="h-4 w-4 text-action-blue" />
            <span className="max-w-[min(80vw,520px)] truncate">{selectedFile.name}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default DragAndDrop
