import Create from "../create"

const CreateLoadBtn = ({ onOpen, text = "Create new load" }) => {
    return(
        <Create text={text} onClick={onOpen} />
    )
}

export default CreateLoadBtn
