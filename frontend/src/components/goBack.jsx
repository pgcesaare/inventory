import { useNavigate } from "react-router-dom";

const GoBack = () => {
    const navigate = useNavigate();
    return (
        <button 
            onClick={() => navigate('/ranches')}
            className="text-sm font-bold"
        >&lt; Select Ranch</button>)
    }

export default GoBack
