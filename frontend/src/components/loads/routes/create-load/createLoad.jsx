import DatePicker from "../../../inputs/inputDate"
import Input from "../../../inputs/input"

const CreateLoad = () => {
    return (
        <div>
            <form>
                <Input
                    label="Select Departure"   
                />
                <DatePicker
                    label="Select Departure Date"
                />
            </form>
        </div>
    )
}

export default CreateLoad