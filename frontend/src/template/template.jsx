import { SidebarProvider, SidebarTrigger } from "@components/ui/sidebar"

const Template = ({ navbar, content }) => {
  return (
    <SidebarProvider>
      <div className="flex w-full h-screen overflow-x-hidden">
        {/* Left navbar / sidebar */}
        <div className="w-fit h-full">
          {navbar}
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col h-full">
          <div className="fixed left-3 top-3 z-[70] md:hidden">
            <SidebarTrigger className="size-8 rounded-lg border border-primary-border/40 bg-white shadow-sm hover:bg-primary-border/10" />
          </div>

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
