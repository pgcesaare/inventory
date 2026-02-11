  const RoutesTemplate = ({ principalTable, secondaryTable }) => {
    return (
      <div className="w-full h-full flex p-7 flex-col space-y-3">
        {/* Content area */}
        <div className="flex-1 w-full flex flex-row gap-5 ">
          {/* Main table */}
          <section className="flex-1 bg-white rounded-xl px-6 py-5 overflow-auto border border-gray-300 shadow-sm">
            {principalTable}
          </section>

          {/* Secondary table */}
          <aside className="w-1/5 bg-white rounded-xl px-6 py-5 overflow-auto border border-gray-300 shadow-sm">
            {secondaryTable}
          </aside>
        </div>
      </div>
    )
  }

  export default RoutesTemplate
