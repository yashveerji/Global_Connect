import axios from "axios";

const api = axios.create({
  baseURL: "https://global-connect-p93z.onrender.com/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
console.log("Stored token:", localStorage.getItem("token"));
export default api;
