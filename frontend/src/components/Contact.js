import React, { useState } from "react";

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form Submitted:", form);
    setSent(true);
    setForm({ name: "", email: "", message: "" });
  };

  return (
    <section className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-lg mt-12">
      <h2 className="text-4xl font-extrabold mb-8 text-center text-indigo-700 tracking-wide">
        Contact Us
      </h2>

      {sent && (
        <div className="mb-6 rounded-md bg-green-100 p-4 text-green-800 text-center font-semibold shadow-md animate-fadeIn">
          Thank you! We’ll get back to you soon.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Your Name"
          className="w-full rounded-lg border border-gray-300 p-4 text-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          required
        />

        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Your Email"
          className="w-full rounded-lg border border-gray-300 p-4 text-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          required
        />

        <textarea
          name="message"
          value={form.message}
          onChange={handleChange}
          placeholder="Your Message"
          rows={6}
          className="w-full rounded-lg border border-gray-300 p-4 text-lg placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          required
        />

        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-semibold py-4 rounded-lg shadow-lg transition-transform active:scale-95"
        >
          Send Message
        </button>
      </form>
    </section>
  );
};

export default Contact;
