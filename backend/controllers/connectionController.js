const User = require("../models/User");

const sendRequest = async (req, res) => {
  const fromUserId = req.user.id;
  const toUserId = req.params.id;

  try {
    const toUser = await User.findById(toUserId);
    if (!toUser) return res.status(404).json({ msg: "User not found" });

    if (
      toUser.connectionRequests.includes(fromUserId) ||
      toUser.connections.includes(fromUserId)
    ) {
      return res.status(400).json({ msg: "Already requested or connected" });
    }

    toUser.connectionRequests.push(fromUserId);
    await toUser.save();

    res.status(200).json({ msg: "Request sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

const acceptRequest = async (req, res) => {
  const currentUserId = req.user.id;
  const requesterId = req.params.id;

  try {
    const me = await User.findById(currentUserId);
    const requester = await User.findById(requesterId);

    if (!me || !requester) return res.status(404).json({ msg: "User not found" });

    if (!me.connectionRequests.includes(requesterId)) {
      return res.status(400).json({ msg: "No such request found" });
    }

    // Add to connections
    me.connections.push(requesterId);
    requester.connections.push(currentUserId);

    // Remove from requests
    me.connectionRequests = me.connectionRequests.filter(
      (id) => id.toString() !== requesterId
    );

    await me.save();
    await requester.save();

    res.status(200).json({ msg: "Request accepted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

const getConnections = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate(
      "connections",
      "_id name email"
    );
    res.json(user.connections);
  } catch (err) {
    res.status(500).json({ msg: "Error getting connections" });
  }
};

const getPendingRequests = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate(
      "connectionRequests",
      "_id name email"
    );
    res.json(user.connectionRequests);
  } catch (err) {
    res.status(500).json({ msg: "Error getting pending requests" });
  }
};

module.exports = {
  sendRequest,
  acceptRequest,
  getConnections,
  getPendingRequests,
};
