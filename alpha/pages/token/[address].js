import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getTokenState, getProgressToNextLevel } from '../../onchain';
import { useContractWrite, useWaitForTransaction, useContractRead, useAccount } from 'wagmi';
import { formatDistanceToNow } from 'date-fns';
import { parseEther, formatEther } from 'viem';
import { higherrrrrrrAbi } from '../../onchain/generated';
import { getEthPrice } from '../../api/price';
import { getLatestTokens } from '../../api/contract';
import Link from 'next/link';

const MAX_SUPPLY = 1_000_000_000; // 1B tokens

export default function TokenPage() {
  const router = useRouter();
  const { address } = router.query;
  const [tokenState, setTokenState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ethPrice, setEthPrice] = useState(0);
  const [amount, setAmount] = useState('');
  const [isBuying, setIsBuying] = useState(true);
  const [latestTokens, setLatestTokens] = useState([]);

  // Get the user's address
  const { address: userAddress } = useAccount();

  // Buy contract interaction
  const { write: buyToken, data: buyData } = useContractWrite({
    address: address,
    abi: higherrrrrrrAbi,
    functionName: 'buy'
  });

  // Sell contract interaction
  const { write: sellToken, data: sellData } = useContractWrite({
    address: address,
    abi: higherrrrrrrAbi,
    functionName: 'sell'
  });

  // Handle transaction states
  const { isLoading: isBuyLoading } = useWaitForTransaction({
    hash: buyData?.hash,
    onSuccess: () => refreshTokenState()
  });

  const { isLoading: isSellLoading } = useWaitForTransaction({
    hash: sellData?.hash,
    onSuccess: () => refreshTokenState()
  });

  const isLoading = isBuyLoading || isSellLoading;

  async function refreshTokenState() {
    if (typeof address === 'string') {
      const state = await getTokenState(address);
      setTokenState(state);
    }
  }

  useEffect(() => {
    if (address) {
      setLoading(true);
      Promise.all([
        refreshTokenState(),
        getEthPrice()
      ])
        .then(([_, priceData]) => {
          console.log('Token state loaded:', tokenState);
          console.log('Current name:', tokenState?.currentName);
          console.log('ETH Price:', priceData.price_usd);
          setEthPrice(priceData.price_usd);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [address]);

  // Refresh ETH price periodically
  useEffect(() => {
    const interval = setInterval(() => {
      getEthPrice()
        .then(priceData => {
          console.log('Updated ETH Price:', priceData.price_usd);
          setEthPrice(priceData.price_usd);
        })
        .catch(console.error);
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Simplify quote reads to only use token amounts
  const { data: buyQuote } = useContractRead({
    address: address,
    abi: higherrrrrrrAbi,
    functionName: 'getTokenBuyQuote',
    args: [parseEther(
      amount && 
      !isNaN(amount) && 
      isFinite(parseFloat(amount)) ? 
      amount : 
      '0'
    )],
    watch: true,
  });

  const { data: sellQuote } = useContractRead({
    address: address,
    abi: higherrrrrrrAbi,
    functionName: 'getTokenSellQuote',
    args: [parseEther(
      amount && 
      !isNaN(amount) && 
      isFinite(parseFloat(amount)) ? 
      amount : 
      '0'
    )],
    watch: true,
  });

  const handleAmountChange = (value) => {
    // Allow empty input
    if (value === '') {
      setAmount('');
      return;
    }

    // Parse the input value
    const numValue = value.replace(/,/g, ''); // Remove commas
    if (isNaN(numValue) || !isFinite(parseFloat(numValue))) {
      return;
    }

    setAmount(numValue);
  };

  const handleTransaction = () => {
    if (!userAddress) return; // Don't proceed if no wallet connected

    if (isBuying) {
      const quote = buyQuote;
      if (!quote) return;
      
      buyToken({
        value: quote,
        args: [
          userAddress, // recipient (user's address)
          userAddress, // refund recipient (user's address)
          "", // comment
          0, // expected market type (0 = BONDING_CURVE, 1 = UNISWAP_POOL)
          parseEther("0.0000001"), // min order size (0.0000001 ETH)
          0n // sqrt price limit (0 for bonding curve)
        ]
      });
    } else {
      sellToken({
        args: [
          parseEther(amount), // tokens to sell
          userAddress, // recipient (user's address)
          "", // comment
          0, // expected market type (0 = BONDING_CURVE, 1 = UNISWAP_POOL)
          parseEther("0.0000001"), // min payout size (0.0000001 ETH)
          0n // sqrt price limit (0 for bonding curve)
        ]
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-green-500 font-mono">Loading...</div>
      </div>
    );
  }

  if (!tokenState) {
    return <div className="text-red-500 font-mono">Token not found</div>;
  }

  // Helper function to format USD price with appropriate decimals
  const formatUsdPrice = (price) => {
    if (price < 0.000001) return price.toExponential(2);
    if (price < 0.01) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    return price.toFixed(2);
  };

  // Helper function to format market cap
  const formatMarketCap = (cap) => {
    if (cap >= 1_000_000_000) return `$${(cap / 1_000_000_000).toFixed(2)}B`;
    if (cap >= 1_000_000) return `$${(cap / 1_000_000).toFixed(2)}M`;
    if (cap >= 1_000) return `$${(cap / 1_000).toFixed(2)}K`;
    return `$${cap.toFixed(2)}`;
  };

  // Calculate values
  const priceInEth = parseFloat(tokenState.currentPrice);
  const usdPrice = priceInEth * ethPrice;
  const totalSupply = parseFloat(tokenState.totalSupply);
  const marketCapUsd = usdPrice * totalSupply;

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono">
      {/* Ticker Bar */}
      <div className="border-b border-green-500/30 p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="text-2xl font-bold">{tokenState.symbol}</div>
          <div className="flex space-x-8">
            <div>
              <div className="text-sm text-green-500/50">Price</div>
              <div className="text-lg">
                ${formatUsdPrice(usdPrice)}
              </div>
            </div>
            <div>
              <div className="text-sm text-green-500/50">Market Cap</div>
              <div className="text-lg">
                {formatMarketCap(marketCapUsd)}
              </div>
            </div>
            <div>
              <div className="text-sm text-green-500/50">Supply</div>
              <div className="flex flex-col">
                <span>{totalSupply.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                <span className="text-sm text-green-500/70">{((totalSupply / 1_000_000_000) * 100).toFixed(2)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-8 space-y-12">
        {/* Current Level */}
        <div className="text-center py-12">
          <div className="text-sm text-green-500/50 mb-4">Current Name</div>
          <div className="text-7xl font-bold mb-6">
            {tokenState.currentName || 'Loading...'}
          </div>
          <div className="text-xl text-green-500/70">
            Level {tokenState.currentLevel} of {tokenState.priceLevels.length}
          </div>
        </div>

        {/* Progress Bar (if on bonding curve) */}
        {tokenState.marketType === 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Bonding Curve Progress</span>
              <span>{(parseFloat(tokenState.totalSupply) / 8000000).toFixed(2)}%</span>
            </div>
            <div className="w-full bg-green-500/20 rounded-full h-4">
              <div 
                className="bg-green-500 h-4 rounded-full transition-all"
                style={{ width: `${(parseFloat(tokenState.totalSupply) / 8000000)}%` }}
              />
            </div>
          </div>
        )}

        {/* Level Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress to Next Level</span>
            <span>{getProgressToNextLevel(tokenState).toFixed(2)}%</span>
          </div>
          <div className="w-full bg-green-500/20 rounded-full h-4">
            <div 
              className="bg-green-500 h-4 rounded-full transition-all"
              style={{ width: `${getProgressToNextLevel(tokenState)}%` }}
            />
          </div>
        </div>

        {/* Levels Table */}
        <div className="border border-green-500/30 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-green-500/30">
                <th className="p-4 text-left">Level</th>
                <th className="p-4 text-left">Name</th>
                <th className="p-4 text-right">Price</th>
                <th className="p-4 text-right">Market Cap</th>
                <th className="p-4 text-center">State</th>
              </tr>
            </thead>
            <tbody>
              {tokenState.priceLevels.map((level, index) => {
                const levelUsdPrice = parseFloat(level.price) * ethPrice;
                const levelMarketCap = levelUsdPrice * MAX_SUPPLY;
                const currentPrice = parseFloat(tokenState.currentPrice) * ethPrice;
                
                // Debug each level comparison
                console.log(`Comparing Level ${index + 1}:`, {
                  levelName: level.name,
                  levelPrice: levelUsdPrice,
                  currentPrice,
                  isCurrentLevel: levelUsdPrice <= currentPrice && 
                    (index === tokenState.priceLevels.length - 1 || 
                     parseFloat(tokenState.priceLevels[index + 1].price) * ethPrice > currentPrice)
                });

                const isCurrentLevel = levelUsdPrice <= currentPrice && 
                  (index === tokenState.priceLevels.length - 1 || 
                   parseFloat(tokenState.priceLevels[index + 1].price) * ethPrice > currentPrice);

                return (
                  <tr 
                    key={index}
                    className={`
                      border-b border-green-500/10 
                      ${isCurrentLevel ? 'bg-green-500/10' : ''}
                    `}
                  >
                    <td className="p-4">{index + 1}</td>
                    <td className="p-4">{level.name}</td>
                    <td className="p-4 text-right">
                      ${formatUsdPrice(levelUsdPrice)}
                    </td>
                    <td className="p-4 text-right">
                      {formatMarketCap(levelMarketCap)}
                    </td>
                    <td className="p-4 text-center">
                      {isCurrentLevel ? (
                        <span className="text-green-500">Current</span>
                      ) : levelUsdPrice > currentPrice ? (
                        <span className="text-green-500/30">Locked</span>
                      ) : (
                        <span className="text-green-500/50">Achieved</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Buy/Sell Section */}
      <div className="max-w-4xl mx-auto p-8 space-y-8">
        {/* Trading Interface */}
        <div className="border border-green-500/30 rounded-lg p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Trade Token</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setIsBuying(true)}
                className={`px-4 py-2 rounded ${
                  isBuying 
                    ? 'bg-green-500 text-black' 
                    : 'border border-green-500 text-green-500'
                }`}
              >
                Buy
              </button>
              <button
                onClick={() => setIsBuying(false)}
                className={`px-4 py-2 rounded ${
                  !isBuying 
                    ? 'bg-green-500 text-black' 
                    : 'border border-green-500 text-green-500'
                }`}
              >
                Sell
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <label className="text-sm text-green-500/70">Amount in Tokens</label>
            </div>

            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="w-full bg-black border border-green-500/30 text-green-500 p-2 rounded focus:border-green-500 focus:outline-none"
              placeholder="Enter amount of tokens..."
            />

            <div className="flex justify-between text-sm">
              <span>Current Price</span>
              <span>{tokenState.currentPrice} ETH (${(parseFloat(tokenState.currentPrice) * ethPrice).toFixed(2)})</span>
            </div>

            {amount && (
              <div className="space-y-2 p-4 bg-green-500/5 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>{isBuying ? "You'll Pay" : "You'll Receive"}</span>
                  <span>
                    {isBuying 
                      ? buyQuote 
                        ? `${formatEther(buyQuote)} ETH`
                        : '...'
                      : sellQuote
                        ? `${formatEther(sellQuote)} ETH`
                        : '...'
                    }
                  </span>
                </div>
                <div className="flex justify-between text-sm text-green-500/70">
                  <span>USD Value</span>
                  <span>
                    {isBuying 
                      ? buyQuote 
                        ? `$${(parseFloat(formatEther(buyQuote)) * ethPrice).toFixed(2)}`
                        : '...'
                      : sellQuote
                        ? `$${(parseFloat(formatEther(sellQuote)) * ethPrice).toFixed(2)}`
                        : '...'
                    }
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleTransaction}
              disabled={tokenState.paused || isLoading || !amount || (isBuying ? !buyQuote : !sellQuote)}
              className="w-full px-4 py-3 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold rounded transition-colors"
            >
              {isLoading 
                ? (isBuying ? "Buying..." : "Selling...") 
                : (isBuying 
                    ? `Buy ${Number(amount).toLocaleString()} Tokens` 
                    : `Sell ${Number(amount).toLocaleString()} Tokens`
                  )
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 