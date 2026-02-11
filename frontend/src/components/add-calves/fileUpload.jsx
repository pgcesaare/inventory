import { useState, useEffect } from "react";
import { useToken } from "../../api/useToken";
import { uploadFile } from "../../api/upload";
import { createCalf } from "../../api/calves";
import DragAndDrop from "./dragAndDrop";
import { getRanchById } from "../../api/ranches";
import { useParams } from "react-router-dom";
import { useAppContext } from "../../context";
import sexOptions from "../../api/sex/sexOptions";

function UploadExcel() {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const token = useToken();
  const { ranch, setRanch } = useAppContext();
  const { id } = useParams();
  const validSexValues = sexOptions.map(option => option.value);

  useEffect(() => {
    if (!ranch && token && id) {
      const fetchRanch = async () => {
        try {
          const data = await getRanchById(id, token);
          setRanch(data);
        } catch (err) {
          console.error(err);
        }
      };
      fetchRanch();
    }
  }, [ranch, id, token]);

  const headerMap = {
    "Ranch Tag": "primaryID",
    "EID": "EID",
    "Dairy ID": "originalID",
    "Date": "placedDate",
    "Breed": "breed",
    "Sex": "sex",
    "Price": "price",
    "Seller": "seller",
    "Status": "status",
    "Condition": "condition",
    "Calf Type": "calfType",
    "Days on Feed": "preDaysOnFeed",
  };

  const currentRanchID = ranch?.id;
  const originRanchID = ranch?.id;
  const status = "feeding";
  const condition = "good";
  const calfType = "1";
  const preDaysOnFeed = 0;

  const handleUploadAndSend = async () => {
    if (!file || !token) return;
    setIsLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await uploadFile(formData, token);
      const rows = response?.data || [];

      const transformed = rows.map(row => {
        const newRow = {};

        for (const key in row) {
          const mappedKey = headerMap[key] || key;
          let value = row[key];

          if (typeof value === "string") {
            value = value.trim();
            const lowerExceptions = ["EID", "Dairy ID", "Ranch Tag"];
            if (!lowerExceptions.includes(key)) value = value.toLowerCase();
          }

          if (mappedKey === "price" || mappedKey === "daysOnFeed") {
            value = Number(value) || 0;
          }

          newRow[mappedKey] = value;
        }

        newRow.currentRanchID = currentRanchID;
        newRow.originRanchID = originRanchID;
        newRow.status = newRow.status || status;
        newRow.condition = newRow.condition || condition;
        newRow.calfType = String(newRow.calfType || calfType);
        newRow.preDaysOnFeed = newRow.preDaysOnFeed ?? preDaysOnFeed;

        newRow.primaryID = String(newRow.primaryID || "").trim();
        newRow.originalID = String(newRow.originalID || "").trim();
        newRow.EID = newRow.EID ? String(newRow.EID).trim() : null;

        if (newRow.sex) {
          if (newRow.sex === "free martin") newRow.sex = "freeMartin";
          else if (!validSexValues.includes(newRow.sex)) newRow.sex = "bull";
        } else {
          newRow.sex = "bull";
        }

        return newRow;
      });

      for (const calf of transformed) {
        await createCalf(calf, token);
      }

      console.log(`${transformed.length} calves uploaded successfully.`);
    } catch (error) {
      console.error("Upload or API error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFile = selectedFile => {
    setFile(selectedFile);
  };

  return (
    <div className="flex flex-col items-start gap-4">
      <DragAndDrop selectedFile={handleFile} />
      <button
        onClick={handleUploadAndSend}
        disabled={!file || isLoading}
        className={`p-2 border rounded ${
          isLoading
            ? "bg-gray-200 cursor-not-allowed"
            : "border-black hover:bg-gray-100"
        }`}
      >
        {isLoading ? "Processing..." : "Upload & Send"}
      </button>
    </div>
  );
}

export default UploadExcel;
