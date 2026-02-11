import { SidebarProvider, SidebarTrigger } from "@components/ui/sidebar"
import { Separator } from "@components/ui/separator"

const Template = ({ navbar, content, title }) => {
  return (
    <SidebarProvider>
      <div className="flex w-screen h-screen">
        {/* Left navbar / sidebar */}
        <div className="w-fit h-full">
          {navbar}
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col h-full">
          {/* Trigger at the top */}
          <div className=" flex flex-row gap-2 px-4 items-center flex-none sticky top-0 z-50 border-b border-gray-300 h-fit">
            <SidebarTrigger />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-"
            />            
            <h1 className="font-bold text-base">{title}</h1>
          </div>

          {/* Content fills remaining space */}
          <div className="flex-1 overflow-auto">
            {content}
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}

export default Template
