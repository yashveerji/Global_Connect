import React from "react";

const InputField = ({
  value,
  onChange,
  placeholder,
  name,
  type = "text",
  className = "",
  required = false,
}) => {
  return (
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className={`w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white ${className}`}
    />
  );
};

export default InputField;
