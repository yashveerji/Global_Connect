import React from "react";
import { useNavigate } from "react-router-dom";
import { Users, Briefcase, FileText, MessageCircle } from "lucide-react";

const Services = () => {
  const navigate = useNavigate();

  const services = [
    {
      title: "Professional Networking",
      desc: "Connect with professionals in your field and grow your network.",
      path: "/connections",
      icon: <Users size={32} className="text-blue-600" />,
    },
    {
      title: "Job Board",
      desc: "Explore job opportunities or post jobs to find the right candidates.",
      path: "/jobs",
      icon: <Briefcase size={32} className="text-green-600" />,
    },
    {
      title: "Post & Engage",
      desc: "Share your thoughts and achievements. Like, comment and repost.",
      path: "/feed",
      icon: <FileText size={32} className="text-purple-600" />,
    },
    {
      title: "Real-Time Chat",
      desc: "Chat instantly with your network in real-time.",
      path: "/messages", // ✅ make sure your route is '/messages'
      icon: <MessageCircle size={32} className="text-pink-600" />,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 min-h-screen bg-white dark:bg-gray-900">
      <h2 className="text-4xl font-bold text-center text-blue-700 mb-10">
        🚀 Our Services
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {services.map((service, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className="mb-4 flex justify-center">{service.icon}</div>
            <h3 className="text-xl font-semibold text-center text-gray-800 dark:text-white mb-2">
              {service.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-4">
              {service.desc}
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => navigate(service.path)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full text-sm transition"
              >
                Explore
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Services;
