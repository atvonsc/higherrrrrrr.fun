export const HigherrrrrrrFactoryAbi = [
  {
    type: "constructor",
    inputs: [
      { name: "_feeRecipient", type: "address", internalType: "address" },
      { name: "_weth", type: "address", internalType: "address" },
      {
        name: "_nonfungiblePositionManager",
        type: "address",
        internalType: "address",
      },
      { name: "_swapRouter", type: "address", internalType: "address" },
      { name: "_bondingCurve", type: "address", internalType: "address" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "bondingCurve",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "convictionImplementation",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "createHigherrrrrrr",
    inputs: [
      { name: "name", type: "string", internalType: "string" },
      { name: "symbol", type: "string", internalType: "string" },
      { name: "uri", type: "string", internalType: "string" },
      {
        name: "levels",
        type: "tuple[]",
        internalType: "struct IHigherrrrrrr.PriceLevel[]",
        components: [
          { name: "price", type: "uint256", internalType: "uint256" },
          { name: "name", type: "string", internalType: "string" },
        ],
      },
    ],
    outputs: [
      { name: "token", type: "address", internalType: "address" },
      { name: "conviction", type: "address", internalType: "address" },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "feeRecipient",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nonfungiblePositionManager",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "swapRouter",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "weth",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "NewToken",
    inputs: [
      {
        name: "token",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "conviction",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  { type: "error", name: "FailedDeployment", inputs: [] },
  {
    type: "error",
    name: "InsufficientBalance",
    inputs: [
      { name: "balance", type: "uint256", internalType: "uint256" },
      { name: "needed", type: "uint256", internalType: "uint256" },
    ],
  },
  { type: "error", name: "Unauthorized", inputs: [] },
  { type: "error", name: "ZeroAddress", inputs: [] },
] as const;
