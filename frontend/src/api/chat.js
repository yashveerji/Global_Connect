// src/api/chat.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL || "http://localhost:8000",
  withCredentials: true
});

export const fetchHistory = (withUser, page = 1, limit = 30) =>
  api.get(`/api/chat/history/${withUser}?page=${page}&limit=${limit}`);

export const fetchInbox = () =>
  api.get(`/api/chat/inbox`);

export const markReadHttp = (withUser) =>
  api.patch(`/api/chat/read/${withUser}`);
