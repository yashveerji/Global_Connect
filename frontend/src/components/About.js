import React from "react";

const About = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-3xl font-bold text-blue-700 mb-4 text-center">
        About Global_Connect
      </h2>
      <p className="text-gray-700 leading-relaxed mb-4">
        <strong>Global_Connect</strong> is a full-stack professional networking platform developed as a Final Year Project by a passionate team of software engineering students. This platform empowers users to build meaningful connections, explore job opportunities, and engage in real-time conversations.
      </p>

      <p className="text-gray-700 leading-relaxed mb-4">
        Our goal is to bridge the gap between job seekers and recruiters while offering a seamless, modern user experience — all inspired by real-world platforms like LinkedIn.
      </p>

      <h3 className="text-xl font-semibold mt-6 mb-2 text-gray-800">👨‍💻 Project Contributors:</h3>
      <ul className="list-disc list-inside text-gray-700 space-y-1">
        <li><strong>Abhinav Shrivastava</strong> – Lead Developer & Project Architect</li>
        <li><strong>Yashveer Singh</strong> – Backend & Database Engineer</li>
        <li><strong>Ritesh Tiwari</strong> – Frontend & UI/UX Designer</li>
        <li><strong>Manu Omar</strong> – Testing & Debugging Specialist</li>
        <li><strong>Nitesh Yadav</strong> – API Integration & Deployment Manager</li>
      </ul>

      <p className="text-gray-700 mt-6">
        From planning and designing to deploying and debugging, each team member contributed valuable skills and dedication to bring <strong>Global_Connect</strong> to life. This project reflects not just our technical ability, but also our teamwork and vision for building digital solutions that matter.
      </p>

      <p className="text-sm text-center text-gray-500 mt-6 italic">
        🚀 Built with 💙 using MERN Stack — MongoDB, Express.js, React, Node.js
      </p>
    </div>
  );
};

export default About;
