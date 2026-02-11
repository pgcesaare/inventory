const EnterButton = ({ text ,onClick }) => {

    return (
        <button 
            className="bg-blue-600 hover:bg-blue-800 rounded-lg px-5 py-2 text-white font-bold text-sm cursor-pointer"
            onClick={onClick}
        >
            {text}
        </button>
    )
} 

export default EnterButton