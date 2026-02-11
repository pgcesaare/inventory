import { X } from "lucide-react";

const LoadSlideContainer = ({ title, children, onClose }) => {
  return (
    <div className="w-full h-full sticky top-0 z-50 flex flex-col border-l border-gray-300">
        <div className="flex flex-row justify-between border-b border-gray-300 p-4">
            <h2 className="text-lg text-gray-900 font-semibold">{title}</h2>
            <button className="cursor-pointer p-1 hover:bg-gray-200 rounded-full"
              onClick={onClose}
            ><X className="size-5 text-black"/></button>
        </div>
      {children}
    </div>
  );
};

export default LoadSlideContainer;
