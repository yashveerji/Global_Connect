import { FaRegSmile, FaRegGrinHearts, FaRegSurprise, FaRegSadTear, FaRegAngry } from "react-icons/fa";

export const REACTIONS = [
  { key: "like", label: "Like", icon: FaRegSmile, color: "#0A66C2", bg: "#E6F2FF" },
  { key: "love", label: "Love", icon: FaRegGrinHearts, color: "#e11d48", bg: "#FFE5EC" },
  { key: "wow", label: "Wow", icon: FaRegSurprise, color: "#ca8a04", bg: "#FFF7CC" },
  { key: "sad", label: "Sad", icon: FaRegSadTear, color: "#2563eb", bg: "#E6EEFF" },
  { key: "angry", label: "Angry", icon: FaRegAngry, color: "#ea580c", bg: "#FFE9DD" },
];
