const MenuElementWrapper = ({content, title, field, handleReset}) => {
    return (
    <div className="flex flex-col my-3 space-y-2 w-full">
      <div className="flex flex-row justify-between w-full">
        <label className="font-bold text-sm text-gray-600">{title}</label>
        <span className="text-blue-500 text-xs font-bold cursor-pointer" onClick={() => handleReset(field)}>Reset</span>
      </div>
        {content}
    </div>
    )
}

export default MenuElementWrapper