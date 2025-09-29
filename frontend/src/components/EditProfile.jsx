import React, { useContext, useEffect, useRef, useState } from "react";
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { RxCross1 } from "react-icons/rx";
import { FiPlus, FiCamera } from "react-icons/fi";
import axios from "axios";
import dp from "../assets/dp.webp";
import { userDataContext } from "../context/UserContext";
import { authDataContext } from "../context/AuthContext";
import { compressImage } from "../utils/image";

// Theme-aware helpers
const SectionCard = ({ title, children }) => (
  <div className="card p-4 space-y-3">
    <h2 className="font-semibold text-lg">{title}</h2>
    {children}
  </div>
);

const SkillTag = ({ skill, onRemove }) => (
  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 dark:border-[var(--gc-border)] bg-white dark:bg-[var(--gc-surface)] text-gray-700 dark:text-[var(--gc-text)]">
    <span className="text-sm">{skill}</span>
    <button onClick={() => onRemove(skill)} title="Remove" className="hover-lift">
      <RxCross1 className="w-3.5 h-3.5 text-gray-500 dark:text-[var(--gc-muted)]" />
    </button>
  </div>
);

const ListItem = ({ data, onRemove }) => (
  <div className="flex justify-between items-start p-3 rounded-lg border border-gray-200 dark:border-[var(--gc-border)] bg-white dark:bg-[var(--gc-surface)]">
    <div className="text-sm space-y-1 w-full pr-3">
      {Object.entries(data)
        .filter(([key]) => key !== "id" && key !== "_id")
        .map(([key, value]) => (
          <div key={key} className="capitalize text-gray-700 dark:text-[var(--gc-text)]">
            {key}: {value}
          </div>
        ))}
    </div>
    <button onClick={onRemove} title="Remove" className="p-1 rounded hover-lift">
      <RxCross1 className="w-4 h-4 text-gray-500 dark:text-[var(--gc-muted)]" />
    </button>
  </div>
);

const AddField = ({ placeholder, value, onChange, onAdd }) => (
  <div className="space-y-2">
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input"
    />
    <button type="button" onClick={onAdd} className="btn-secondary w-full">
      Add
    </button>
  </div>
);

const MultiAddField = ({ fields, onAdd }) => (
  <div className="space-y-2">
    {fields.map((f, idx) => (
      <input
        key={idx}
        type="text"
        placeholder={f.placeholder}
        value={f.value}
        onChange={(e) => f.setter(e.target.value)}
        className="input"
      />
    ))}
    <button type="button" onClick={onAdd} className="btn-secondary w-full">
      Add
    </button>
  </div>
);

function EditProfile() {
  const { setEdit, userData, setUserData } = useContext(userDataContext);
  const { serverUrl } = useContext(authDataContext);

  const [firstName, setFirstName] = useState(userData?.firstName || "");
  const [lastName, setLastName] = useState(userData?.lastName || "");
  const [userName, setUserName] = useState(userData?.userName || "");
  const [headline, setHeadline] = useState(userData?.headline || "");
  const [location, setLocation] = useState(userData?.location || "");
  const [gender, setGender] = useState(userData?.gender || "");
  const [skills, setSkills] = useState(Array.isArray(userData?.skills) ? userData.skills : []);
  const [newSkills, setNewSkills] = useState("");
  const [education, setEducation] = useState(Array.isArray(userData?.education) ? userData.education : []);
  const [newEducation, setNewEducation] = useState({ college: "", degree: "", fieldOfStudy: "" });
  const [experience, setExperience] = useState(Array.isArray(userData?.experience) ? userData.experience : []);
  const [newExperience, setNewExperience] = useState({ title: "", company: "", description: "" });

  const [frontendProfileImage, setFrontendProfileImage] = useState(userData?.profileImage || dp);
  const [backendProfileImage, setBackendProfileImage] = useState(null);
  const [frontendCoverImage, setFrontendCoverImage] = useState(userData?.coverImage || null);
  const [backendCoverImage, setBackendCoverImage] = useState(null);
  const [saving, setSaving] = useState(false);

  const profileImage = useRef();
  const coverImage = useRef();

  const addSkill = () => {
    if (newSkills && !skills.includes(newSkills)) setSkills([...skills, newSkills]);
    setNewSkills("");
  };
  const removeSkill = (skill) => setSkills(skills.filter((s) => s !== skill));

  const addEducation = () => {
    if (newEducation.college && newEducation.degree && newEducation.fieldOfStudy) {
      setEducation([...education, newEducation]);
    }
    setNewEducation({ college: "", degree: "", fieldOfStudy: "" });
  };
  const removeEducation = (edu) => setEducation(education.filter((e) => e !== edu));

  const addExperience = () => {
    if (newExperience.title && newExperience.company && newExperience.description) {
      setExperience([...experience, newExperience]);
    }
    setNewExperience({ title: "", company: "", description: "" });
  };
  const removeExperience = (exp) => setExperience(experience.filter((e) => e !== exp));

  const handleProfileImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file, { maxDim: 512, quality: 0.8 });
    setBackendProfileImage(compressed);
    setFrontendProfileImage(URL.createObjectURL(compressed));
  };

  const handleCoverImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file, { maxDim: 1920, quality: 0.82 });
    setBackendCoverImage(compressed);
    setFrontendCoverImage(URL.createObjectURL(compressed));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const formdata = new FormData();
      formdata.append("firstName", firstName);
      formdata.append("lastName", lastName);
      formdata.append("userName", userName);
      formdata.append("headline", headline);
      formdata.append("location", location);
      formdata.append("gender", gender);
      formdata.append("skills", JSON.stringify(skills));
      formdata.append("education", JSON.stringify(education));
      formdata.append("experience", JSON.stringify(experience));
      if (backendProfileImage) formdata.append("profileImage", backendProfileImage);
      if (backendCoverImage) formdata.append("coverImage", backendCoverImage);

      const result = await axios.put(`${serverUrl}/api/user/updateprofile`, formdata, { withCredentials: true });
      setUserData(result.data);
      setSaving(false);
      setEdit(false);
    } catch (error) {
      console.log(error);
      setSaving(false);
    }
  };

  const removeProfile = async () => {
    try {
      const result = await axios.delete(`${serverUrl}/api/user/profile-image`, { withCredentials: true });
      setFrontendProfileImage(dp);
      setBackendProfileImage(null);
      setUserData(result.data);
    } catch (e) { console.log(e); }
  };

  const removeCover = async () => {
    try {
      const result = await axios.delete(`${serverUrl}/api/user/cover-image`, { withCredentials: true });
      setFrontendCoverImage(null);
      setBackendCoverImage(null);
      setUserData(result.data);
    } catch (e) { console.log(e); }
  };
  // Lock background scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const overlay = (
    <AnimatePresence>
      <motion.div
        key="edit-overlay"
        className="fixed inset-0 z-[1200] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEdit(false)} />

        {/* Hidden file inputs */}
        <input type="file" accept="image/*" hidden ref={profileImage} onChange={handleProfileImage} />
        <input type="file" accept="image/*" hidden ref={coverImage} onChange={handleCoverImage} />

        {/* Modal panel */}
        <motion.div
          className="relative w-full max-w-2xl max-h-[86vh] z-[1201] overflow-hidden shadow-elevated rounded-2xl pointer-events-auto"
          initial={{ opacity: 0, scale: 0.98, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -6 }}
          transition={{ duration: 0.18 }}
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="card p-0 overflow-hidden relative flex flex-col max-h-[86vh]">
            {/* Close button */}
            <button
              className="absolute top-3 right-3 p-2 rounded-full hover-lift"
              onClick={() => setEdit(false)}
              aria-label="Close"
              title="Close"
            >
              <RxCross1 className="w-5 h-5 text-gray-600 dark:text-[var(--gc-muted)]" />
            </button>

            {/* Scrollable content */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {/* Cover image */}
              <div className="relative border-b border-gray-200 dark:border-[var(--gc-border)]">
                <div
                  className="w-full h-44 overflow-hidden cursor-pointer group"
                  onClick={(e) => { e.stopPropagation(); coverImage.current?.click(); }}
                >
                {frontendCoverImage ? (
                  <img src={frontendCoverImage} alt="cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-[var(--gc-muted)] text-sm">
                    Add cover photo
                  </div>
                )}
                <FiCamera className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700 dark:text-[var(--gc-text)]/80 text-xl opacity-75 group-hover:opacity-100" />
                </div>
                {frontendCoverImage && (
                  <div className="p-2 flex justify-end">
                    <button type="button" onClick={(e) => { e.stopPropagation(); removeCover(); }} className="text-sm px-3 py-1 rounded border border-gray-200 dark:border-[var(--gc-border)] hover:bg-gray-50 dark:hover:bg-[var(--gc-surface)]">
                      Remove cover image
                    </button>
                  </div>
                )}
              </div>

              {/* Profile image */}
              <div className="-mt-10 ml-6">
                <div
                  className="relative w-24 h-24 rounded-full overflow-hidden border-4 shadow-lg cursor-pointer"
                  style={{ borderColor: "var(--gc-surface)" }}
                  onClick={(e) => { e.stopPropagation(); profileImage.current?.click(); }}
                >
                <img src={frontendProfileImage} alt="profile" className="w-full h-full object-cover" />
                <div
                  className="absolute bottom-0 right-0 p-1 rounded-full border-2"
                  style={{ background: "var(--gc-primary)", borderColor: "var(--gc-surface)" }}
                >
                  <FiPlus className="text-white" />
                </div>
                </div>
                {frontendProfileImage && frontendProfileImage !== dp && (
                  <div className="pt-2">
                    <button type="button" onClick={(e) => { e.stopPropagation(); removeProfile(); }} className="text-sm px-3 py-1 rounded border border-gray-200 dark:border-[var(--gc-border)] hover:bg-gray-50 dark:hover:bg-[var(--gc-surface)]">
                      Remove profile image
                    </button>
                  </div>
                )}
              </div>

              {/* Form */}
              <form className="p-5 pt-4 space-y-6" onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { placeholder: "First Name", value: firstName, setter: setFirstName },
                    { placeholder: "Last Name", value: lastName, setter: setLastName },
                    { placeholder: "Username", value: userName, setter: setUserName },
                    { placeholder: "Headline", value: headline, setter: setHeadline },
                    { placeholder: "Location", value: location, setter: setLocation },
                    { placeholder: "Gender", value: gender, setter: setGender },
                  ].map((field, idx) => (
                    <input
                      key={idx}
                      type="text"
                      placeholder={field.placeholder}
                      value={field.value}
                      onChange={(e) => field.setter(e.target.value)}
                      className="input"
                    />
                  ))}
                </div>

                {/* Skills */}
                <SectionCard title="Skills">
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, index) => (
                      <SkillTag key={index} skill={skill} onRemove={removeSkill} />
                    ))}
                  </div>
                  <AddField placeholder="Add new skill" value={newSkills} onChange={setNewSkills} onAdd={addSkill} />
                </SectionCard>

                {/* Education */}
                <SectionCard title="Education">
                  <div className="space-y-2">
                    {education.map((edu, index) => (
                      <ListItem key={index} data={edu} onRemove={() => removeEducation(edu)} />
                    ))}
                  </div>
                  <MultiAddField
                    fields={[
                      { placeholder: "College", value: newEducation.college, setter: (v) => setNewEducation({ ...newEducation, college: v }) },
                      { placeholder: "Degree", value: newEducation.degree, setter: (v) => setNewEducation({ ...newEducation, degree: v }) },
                      { placeholder: "Field of Study", value: newEducation.fieldOfStudy, setter: (v) => setNewEducation({ ...newEducation, fieldOfStudy: v }) },
                    ]}
                    onAdd={addEducation}
                  />
                </SectionCard>

                {/* Experience */}
                <SectionCard title="Experience">
                  <div className="space-y-2">
                    {experience.map((exp, index) => (
                      <ListItem key={index} data={exp} onRemove={() => removeExperience(exp)} />
                    ))}
                  </div>
                  <MultiAddField
                    fields={[
                      { placeholder: "Title", value: newExperience.title, setter: (v) => setNewExperience({ ...newExperience, title: v }) },
                      { placeholder: "Company", value: newExperience.company, setter: (v) => setNewExperience({ ...newExperience, company: v }) },
                      { placeholder: "Description", value: newExperience.description, setter: (v) => setNewExperience({ ...newExperience, description: v }) },
                    ]}
                    onAdd={addExperience}
                  />
                </SectionCard>

                {/* Save */}
                <button type="submit" disabled={saving} className="btn-primary w-full py-3 disabled:opacity-60 disabled:cursor-not-allowed">
                  {saving ? "Saving..." : "Save Profile"}
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
  return typeof document !== 'undefined' ? createPortal(overlay, document.body) : overlay;
}

export default EditProfile;
