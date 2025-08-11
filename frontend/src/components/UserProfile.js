import React, { useEffect, useState } from "react";
import api from "../utils/axios";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

const UserProfile = () => {
  const { user, token } = useSelector((state) => state.user);
  const [formData, setFormData] = useState({
    bio: "",
    skills: "",
    experience: "",
    education: "",
    profilePic: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (user && token) {
      api
        .get(`/users/${user._id}`, {
          headers: { Authorization: token },
        })
        .then((res) => {
          const u = res.data;
          setFormData({
            bio: u.bio || "",
            skills: u.skills?.join(", ") || "",
            experience: JSON.stringify(u.experience || []),
            education: JSON.stringify(u.education || []),
            profilePic: u.profilePic || "",
          });
          setPreview(u.profilePic || "");
        })
        .catch(() => toast.error("Failed to fetch profile"));
    }
  }, [user, token]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImageUpload = async () => {
    if (!imageFile) return "";
    try {
      const fd = new FormData();
      fd.append("image", imageFile);
      const res = await api.post("/upload/image", fd, {
        headers: { Authorization: token },
      });
      return res.data.url;
    } catch {
      toast.error("Image upload failed");
      return "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let profilePicURL = formData.profilePic;
    if (imageFile) {
      profilePicURL = await handleImageUpload();
    }

    const payload = {
      ...formData,
      profilePic: profilePicURL,
      skills: formData.skills.split(",").map((s) => s.trim()),
      experience: JSON.parse(formData.experience),
      education: JSON.parse(formData.education),
    };

    api
      .put(`/users/${user._id}`, payload, {
        headers: { Authorization: token },
      })
      .then(() => toast.success("Profile updated!"))
      .catch(() => toast.error("Failed to update profile"));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImageFile(file);
    if (file) setPreview(URL.createObjectURL(file));
  };

  return (
    <div className="max-w-xl mx-auto mt-10 bg-white dark:bg-gray-900 shadow p-6 rounded-xl text-gray-800 dark:text-white">
      <h2 className="text-3xl font-bold text-center mb-6 text-blue-600">Edit Profile</h2>

      {preview && (
        <div className="text-center mb-6">
          <img
            src={preview}
            alt="Preview"
            className="w-24 h-24 mx-auto rounded-full object-cover border"
          />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Bio</label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            placeholder="Your bio"
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Skills (comma separated)</label>
          <input
            name="skills"
            value={formData.skills}
            onChange={handleChange}
            placeholder="e.g., React, Node.js, MongoDB"
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Experience (JSON format)
          </label>
          <textarea
            name="experience"
            value={formData.experience}
            onChange={handleChange}
            placeholder='[{"company":"ABC","role":"Dev","from":"2022","to":"2023"}]'
            className="input font-mono text-xs"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Education (JSON format)
          </label>
          <textarea
            name="education"
            value={formData.education}
            onChange={handleChange}
            placeholder='[{"school":"XYZ","degree":"B.Tech","from":"2018","to":"2022"}]'
            className="input font-mono text-xs"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Profile Picture</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="block mt-1"
          />
        </div>

        <button type="submit" className="btn-primary w-full mt-4">
          Save Profile
        </button>
      </form>
    </div>
  );
};

export default UserProfile;
