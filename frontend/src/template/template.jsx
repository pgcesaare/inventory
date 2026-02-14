import { SidebarProvider, SidebarTrigger } from "@components/ui/sidebar"
import { Separator } from "@components/ui/separator"

const Template = ({ navbar, content, title, showTopBar = true }) => {
  return (
    <SidebarProvider>
      <div className="flex w-full h-screen overflow-x-hidden">
        {/* Left navbar / sidebar */}
        <div className="w-fit h-full">
          {navbar}
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col h-full">
          {showTopBar && (
            <div className=" flex flex-row gap-2 px-4 items-center flex-none sticky top-0 z-50 border-b border-primary-border/40 bg-background h-fit">
              <SidebarTrigger />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-"
              />
              <h1 className="font-bold text-base text-primary-text">{title}</h1>
            </div>
          )}

          {/* Content fills remaining space */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {content}
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}

export default Template
