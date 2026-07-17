export const susuCircleAbi = [
  {
    type: "function",
    name: "getCircle",
    stateMutability: "view",
    inputs: [{ name: "circleId", type: "uint256" }],
    outputs: [
      { name: "creator", type: "address" },
      { name: "contributionAmount", type: "uint256" },
      { name: "totalRounds", type: "uint256" },
      { name: "roundInterval", type: "uint256" },
      { name: "currentRound", type: "uint256" },
      { name: "roundStartTime", type: "uint256" },
      { name: "paidCount", type: "uint256" },
      { name: "status", type: "uint8" },
      { name: "participantCount", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getCurrentRecipient",
    stateMutability: "view",
    inputs: [{ name: "circleId", type: "uint256" }],
    outputs: [{ name: "recipient", type: "address" }],
  },
  {
    type: "function",
    name: "hasPaidRound",
    stateMutability: "view",
    inputs: [
      { name: "circleId", type: "uint256" },
      { name: "round", type: "uint256" },
      { name: "participant", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "isParticipant",
    stateMutability: "view",
    inputs: [
      { name: "circleId", type: "uint256" },
      { name: "participant", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "nextCircleId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;
