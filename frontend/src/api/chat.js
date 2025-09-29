// src/api/chat.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL || "http://localhost:8000",
  withCredentials: true
});

export const fetchHistory = (withUser, { page = 1, limit = 30, before } = {}) => {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (before) params.set('before', new Date(before).toISOString());
  return api.get(`/api/chat/history/${withUser}?${params.toString()}`);
};

export const fetchInbox = () =>
  api.get(`/api/chat/inbox`);

export const markReadHttp = (withUser) =>
  api.patch(`/api/chat/read/${withUser}`);

export const editMessageHttp = (id, text) =>
  api.patch(`/api/chat/message/${id}`, { text });

export const deleteMessageHttp = (id) =>
  api.delete(`/api/chat/message/${id}`);

export const reactMessageHttp = (id, emoji) =>
  api.post(`/api/chat/message/${id}/react`, { emoji });
