const ResetButton = ({ text, onClick, type }) => {

    return (
        <button
            type={type}
            className="bg-gray-300 hover:bg-gray-400 rounded-lg px-5 py-2 text-black font-bold text-sm cursor-pointer"
            onClick={onClick}
        >
            {text}
        </button>
    )
} 

export default ResetButton