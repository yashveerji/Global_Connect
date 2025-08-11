import React from "react";
import { Link } from "react-router-dom";
import { Users, Briefcase, FileText, MessageCircle } from "lucide-react";

const Home = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-white">
      {/* 🌅 Hero Section */}
      <section
        className="relative text-center py-28 px-4 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?fit=crop&w=1350&q=80')",
        }}
      >
        <div className="absolute inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-sm" />
        <div className="relative z-10 p-10 max-w-3xl mx-auto animate-fadeInUp">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6 text-white drop-shadow-lg">
            Welcome to <span className="text-blue-400">Global_Connect</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-200 mb-8">
            A platform by <strong>GNCIPL AITD TEAM G5</strong> & team connecting professionals across the globe — built with purpose, passion, and collaboration.
          </p>
          <Link
            to="/signup"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-7 py-3 rounded-full text-lg font-semibold shadow-md transition transform hover:scale-105"
          >
            🚀 Join Now
          </Link>
        </div>
      </section>

      {/* 💼 Services Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-gray-100 to-white dark:from-gray-800 dark:to-gray-900">
        <h2 className="text-3xl font-bold text-center mb-12">
          Our <span className="text-blue-600">Services</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          <Link to="/connections">
            <ServiceCard
              icon={<Users size={40} />}
              title="Professional Networking"
              description="Connect with professionals in your field and grow your network."
            />
          </Link>
          <Link to="/jobs">
            <ServiceCard
              icon={<Briefcase size={40} />}
              title="Job Board"
              description="Explore job opportunities or post jobs to find the right candidates."
            />
          </Link>
          <Link to="/feed">
            <ServiceCard
              icon={<FileText size={40} />}
              title="Post & Engage"
              description="Share your thoughts and achievements. Like, comment and repost."
            />
          </Link>
          <Link to="/messages">
            <ServiceCard
              icon={<MessageCircle size={40} />}
              title="Real-Time Chat"
              description="Chat instantly with your network in real-time."
            />
          </Link>
        </div>
      </section>
    </div>
  );
};

const ServiceCard = ({ icon, title, description }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 text-center border border-gray-100 dark:border-gray-700">
    <div className="text-blue-600 dark:text-blue-400 mb-4 flex justify-center">{icon}</div>
    <h4 className="text-xl font-semibold mb-2">{title}</h4>
    <p className="text-gray-600 dark:text-gray-300 text-sm">{description}</p>
  </div>
);

export default Home;
