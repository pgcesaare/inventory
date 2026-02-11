import { useEffect, useState } from "react"
import { useDropzone } from "react-dropzone"

const DragAndDrop = ({ selectedFile }) => {


    const { acceptedFiles, getRootProps, getInputProps } = useDropzone({
        accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
        },
        maxFiles: 1
    })

    useEffect(() => {
        if (acceptedFiles.length > 0) {
            selectedFile(acceptedFiles[0])
        }
    }, [acceptedFiles, selectedFile])

    return (
        <div className="w-100 h-fit mb-2">
            <div {...getRootProps({className: 'w-100 h-100 border border-dashed border-black flex flex-col justify-center items-center p-5 cursor-pointer'})}>
                <input {...getInputProps()} />
                    <p>Drag 'n' drop some files here, or click to select files</p>
            </div>
            <aside className="flex flex-col">
                <h4>File</h4>
                <ul>
                    {acceptedFiles.map(file => (
                        <li key={file.path}>
                            {file.path} - {file.size} bytes
                        </li>
                    ))}
                </ul>
            </aside>
        </div>
    )
}

export default DragAndDrop