import { useContext, useEffect, useState } from "react";
import { authDataContext } from "../context/AuthContext";
import axios from "axios";

export function useConnections() {
  const { serverUrl } = useContext(authDataContext);
  const [connections, setConnections] = useState([]);

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const res = await axios.get(`${serverUrl}/api/connection/`, {
          withCredentials: true,
        });
        setConnections(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setConnections([]);
      }
    };
    fetchConnections();
  }, [serverUrl]);

  return connections;
}
