import React, { useContext, useEffect, useState } from 'react'
import { authDataContext } from '../context/AuthContext'
import axios from 'axios'
import { userDataContext } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'

function ConnectionButton({ userId }) {
    const { serverUrl } = useContext(authDataContext)
    const { userData, socket } = useContext(userDataContext)
    const [status, setStatus] = useState("")
    const navigate = useNavigate()

    const handleSendConnection = async () => {
        try {
            let result = await axios.post(
                `${serverUrl}/api/connection/send/${userId}`,
                {},
                { withCredentials: true }
            )
            console.log(result)
        } catch (error) {
            console.log(error)
        }
    }

    const handleRemoveConnection = async () => {
        try {
            let result = await axios.delete(
                `${serverUrl}/api/connection/remove/${userId}`,
                { withCredentials: true }
            )
            console.log(result)
        } catch (error) {
            console.log(error)
        }
    }

    const handleGetStatus = async () => {
        try {
            let result = await axios.get(
                `${serverUrl}/api/connection/getStatus/${userId}`,
                { withCredentials: true }
            )
            console.log(result)
            setStatus(result.data.status)
        } catch (error) {
            console.log(error)
        }
    }

    useEffect(() => {
        handleGetStatus()
        if (!socket) return;
        if (userData?._id) {
            try { socket.emit("register", userData._id) } catch {}
        }
        const onStatus = ({ updatedUserId, newStatus }) => {
            if (updatedUserId === userId) setStatus(newStatus)
        }
        socket.on("statusUpdate", onStatus)
        return () => {
            try { socket.off("statusUpdate", onStatus) } catch {}
        }
    }, [userId, userData?._id, socket])

    const handleClick = async () => {
        if (status === "disconnect") {
            await handleRemoveConnection()
        } else if (status === "received") {
            navigate("/network")
        } else {
            await handleSendConnection()
        }
    }

    const handleViewProfile = () => {
        navigate(`/profile/${userId}`)
    }

    return (
        <div className="flex gap-2 items-center">
            <button
                className="min-w-[100px] h-[40px] rounded-full border-2 border-[#2dc0ff] text-[#2dc0ff]"
                onClick={handleClick}
                disabled={status === "pending"}
            >
                {status}
            </button>

            {/* Extra button to view profile when connected */}
            {status === "connected" && (
                <button
                    className="min-w-[120px] h-[40px] rounded-full border-2 border-green-500 text-green-500"
                    onClick={handleViewProfile}
                >
                    View Profile
                </button>
            )}
        </div>
    )
}

export default ConnectionButton
