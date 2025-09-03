
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Nav from '../components/Nav';
import dp from "../assets/dp.webp";
import { HiPencil } from "react-icons/hi2";
import { userDataContext } from '../context/UserContext';
import { authDataContext } from '../context/AuthContext';
import EditProfile from '../components/EditProfile';
import Post from '../components/Post';
import ConnectionButton from '../components/ConnectionButton';


function Profile() {
  const { userData, edit, setEdit, postData, profileData, setProfileData } = useContext(userDataContext);
  const { serverUrl } = useContext(authDataContext);
  const { userName } = useParams();

  const [profilePost, setProfilePost] = useState([]);
  const [visibleCount, setVisibleCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef(null);

  // Fetch profile data if userName param exists (viewing someone else's profile)
  useEffect(() => {
    const fetchProfile = async () => {
      if (userName) {
        setLoading(true);
        try {
          const res = await fetch(`${serverUrl}/api/user/profile/${userName}`, { credentials: 'include' });
          const data = await res.json();
          setProfileData(data);
        } catch (err) {
          setProfileData({});
        }
        setLoading(false);
      }
    };
    fetchProfile();
    // eslint-disable-next-line
  }, [userName, serverUrl]);

  useEffect(() => {
    if (profileData && profileData._id) {
      setProfilePost(postData.filter((post) => post.author._id === profileData._id));
      setVisibleCount(5);
    }
  }, [profileData, postData]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setVisibleCount((c) => Math.min(c + 5, profilePost.length));
        }
      });
    }, { rootMargin: '200px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [profilePost.length]);

  const Skeleton = () => (
    <div className="card p-4 animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2" />
      <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
    </div>
  );
  if (loading || !profileData || !profileData._id) {
    return (
      <div className="w-full min-h-screen">
        <Nav />
        <div className="max-w-[1200px] mx-auto pt-[100px] px-4 pb-10 flex flex-col gap-4">
          <Skeleton />
          <Skeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex flex-col items-center animate-fade-in">
      <Nav />
      {edit && <EditProfile />}

      <div className="w-full max-w-[1200px] flex flex-col lg:flex-row gap-6 pt-[100px] px-4 pb-10">
        {/* Left Column - Posts */}
        <div className="w-full lg:w-2/3 flex flex-col gap-6">
          {/* Profile Card */}
          <div className="relative card overflow-hidden">
            {/* Cover Image */}
            <div className="w-full h-36 bg-gray-100 dark:bg-[var(--gc-surface)] overflow-hidden cursor-pointer border-b border-gray-200 dark:border-[var(--gc-border)]">
              {profileData.coverImage ? (
                <img src={profileData.coverImage} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-[var(--gc-muted)]">No Cover Photo</div>
              )}
            </div>

            {/* Profile Picture */}
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 shadow-lg absolute top-24 left-6 cursor-pointer" style={{ borderColor: 'var(--gc-surface)' }}>
              <img src={profileData.profileImage || dp} alt="Profile" className="w-full h-full object-cover" />
            </div>

            {/* User Info */}
            <div className="mt-16 ml-6 mb-4">
              <div className="text-2xl font-semibold">{`${profileData.firstName} ${profileData.lastName}`}</div>
              <div className="text-lg text-gray-600 dark:text-[var(--gc-muted)]">{profileData.headline || ""}</div>
              <div className="mt-1 flex flex-wrap gap-2 text-sm">
                {profileData.location && (
                  <span className="chip">{profileData.location}</span>
                )}
                <span className="chip">{`${profileData.connection.length} connections`}</span>
              </div>
              {/* No ID shown here */}
              {/* Action Button */}
              {profileData._id === userData._id ? (
                <button
                  className="mt-4 btn-primary flex items-center gap-2"
                  onClick={() => setEdit(true)}
                >
                  Edit Profile <HiPencil />
                </button>
              ) : (
                <div className="mt-4">
                  <ConnectionButton userId={profileData._id} />
                </div>
              )}
            </div>
          </div>

          {/* Posts Section */}
          <div className="card p-4 flex flex-col gap-4">
            <div className="text-xl font-semibold">{`Posts (${profilePost.length})`}</div>
            {profilePost.length === 0 && <div className="text-gray-600 dark:text-[var(--gc-muted)] text-center py-4">No Posts Yet</div>}
            {profilePost.slice(0, visibleCount).map((post, index) => (
              <Post
                key={index}
                id={post._id}
                description={post.description}
                author={post.author}
                image={post.image}
                like={post.like}
                comment={post.comment}
                createdAt={post.createdAt}
              />
            ))}
            {visibleCount < profilePost.length && (
              <div ref={sentinelRef} className="h-10 flex items-center justify-center text-sm text-gray-500">Loading more…</div>
            )}
          </div>
        </div>

        {/* Right Column - Skills, Education, Experience */}
    <div className="w-full lg:w-1/3 flex flex-col gap-6">
          {/* Skills */}
          {profileData.skills.length > 0 && (
            <Card title="Skills">
        <div className="flex flex-wrap gap-2">
                {profileData.skills.map((skill, idx) => (
          <span key={idx} className="chip">{skill}</span>
                ))}
              </div>
              {profileData._id === userData._id && (
                <button
          className="mt-3 w-full btn-secondary"
                  onClick={() => setEdit(true)}
                >
                  Add Skills
                </button>
              )}
            </Card>
          )}

          {/* Education */}
          {profileData.education.length > 0 && (
            <Card title="Education">
              <div className="flex flex-col gap-3">
                {profileData.education.map((edu, idx) => (
                  <div key={idx} className="card p-3">
                    <div className="font-semibold">College: {edu.college}</div>
                    <div className="text-gray-600 dark:text-[var(--gc-muted)]">Degree: {edu.degree}</div>
                    <div className="text-gray-600 dark:text-[var(--gc-muted)]">Field: {edu.fieldOfStudy}</div>
                  </div>
                ))}
              </div>
              {profileData._id === userData._id && (
                <button
                  className="mt-3 w-full btn-secondary"
                  onClick={() => setEdit(true)}
                >
                  Add Education
                </button>
              )}
            </Card>
          )}

          {/* Experience */}
          {profileData.experience.length > 0 && (
            <Card title="Experience">
              <div className="flex flex-col gap-3">
                {profileData.experience.map((ex, idx) => (
                  <div key={idx} className="card p-3">
                    <div className="font-semibold">Title: {ex.title}</div>
                    <div className="text-gray-600 dark:text-[var(--gc-muted)]">Company: {ex.company}</div>
                    <div className="text-gray-600 dark:text-[var(--gc-muted)]">Description: {ex.description}</div>
                  </div>
                ))}
              </div>
              {profileData._id === userData._id && (
                <button
                  className="mt-3 w-full btn-secondary"
                  onClick={() => setEdit(true)}
                >
                  Add Experience
                </button>
              )}
            </Card>
          )}
        </div>

      </div>
    </div>
  );
}

export default Profile;

/* Card Helper Component */
function Card({ title, children }) {
  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="text-lg font-semibold">{title}</div>
      {children}
    </div>
  );
}
