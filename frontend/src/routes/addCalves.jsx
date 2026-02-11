import { useNavigate } from "react-router-dom";

const AddCalves = () => {

  const navigate = useNavigate();

  return (

    <>
      <div className="flex flex-col gap-5">
        <h1 className="text-xl font-bold">Add calves</h1>
        <h3>Options: </h3>
        <div className="flex flex-col items-start">
          <button
            className="cursor-pointer"
            onClick={() => navigate("./one-by-one")}>
              Add one by one
            </button>
            <button
              className="cursor-pointer"
              onClick={() => navigate("./bulk-data")}>
                Bulk data
              </button>
        </div>
      </div>
    </>
  );
};

export default AddCalves;
