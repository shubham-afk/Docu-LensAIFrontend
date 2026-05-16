import axios from "axios";

export async function uploadDocument(file) {
  const formData = new FormData();

  formData.append("file", file);

  const response = await axios.post(
    "http://127.0.0.1:8000/api/upload/",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
}