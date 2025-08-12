import axios from 'axios';

const api = axios.create({
  baseURL: 'https://global-connect-p93z.onrender.com/api', // backend ka URL
});

export default api;
