import { useState, useEffect, useRef } from "react"
import { XMarkIcon } from "@heroicons/react/24/outline"
import { cloneElement } from "react"
import { useAppContext } from "../../../context"
import EnterButton from "../../extra/EnterButton"
import ResetButton from "../../extra/ResetButton"

const MenuTemplate = ({icon ,title, content, action, isFilter, setIsFilter, buttons}) => {

    const [ isOpen, setIsOpen ] = useState(false)
    const customIcon = cloneElement(icon, { className: "h-5 w-5 text-black"})
    const menuRef = useRef(null)

    useEffect(() => {
        const handleClickOutside = (event) => {
        const clickedInsideMenu = menuRef.current?.contains(event.target);
        const clickedInsidePopover = event.target.closest(
          '[data-slot="popover-content"]'
        );

        if (!clickedInsideMenu && !clickedInsidePopover) {
          setIsOpen(false)
        }
      };

      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside)
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside)
      };
    }, [isOpen])
    
    const { setSelected } = useAppContext()


    const handleApply= () => {
      action?.()
      setIsOpen(false)
      setIsFilter(true)
    }

    const ResetAll = () => {
      setSelected("")
      setIsFilter(false)
    }

    return (
        <div>
        <button
            className={`flex flex-row items-center text-gray-800 gap-2 px-2 py-2 text-xs rounded-lg border cursor-pointer shadow-xs  
              ${isFilter ? "bg-blue-100 hover:bg-blue-300 border-1 border-blue-500" : "bg-white hover:bg-gray-200 border  border-gray-300" }`}
            onClick={() => setIsOpen(prev => !prev)}
        >
            {icon}
            {title}
        </button>
        {isOpen &&
            <div ref={menuRef} className="bg-white border border-gray-300 rounded-lg absolute top-10 right-0 w-[300px] h-fit z-20 px-3 py-5">
                <div className="flex flex-row justify-between items-center border-b border-gray-300 pb-1">
                    <div className="flex flex-row items-center gap-1">
                        {customIcon}
                        <h3 className="font-bold text-lg">{title}</h3>
                    </div>
                    <button 
                        className="cursor-pointer"
                        onClick={() => setIsOpen(prev => !prev)}>
                        <XMarkIcon className="text-black h-6 w-6"/>
                    </button>
                </div>
                {content && typeof content.type !== "string" && cloneElement(content, { setIsOpen, setIsFilter })}
                {content && typeof content.type === "string" && content}
                {buttons &&                 
                
                <div className="flex flex-row justify-between border-t border-gray-300 pt-3">
                    <ResetButton text="Reset" onClick={() => ResetAll()}/>
                    <EnterButton text="Apply" onClick={() => handleApply()}/>
                </div>
                
                }
            </div>
        }
        </div>
    )
}

export default MenuTemplate
