import { createPublicClient, http, formatEther } from 'viem';
import { base } from 'wagmi/chains';
import { getCurrentChain } from '../components/Web3Provider';
import { higherrrrrrrAbi } from './generated';

// Create public client
const publicClient = createPublicClient({
  chain: base,
  transport: http('https://base-mainnet.g.alchemy.com/v2/l0XzuD715Z-zd21ie5dbpLKrptTuq07a')
});

export interface PriceLevel {
  price: string;
  name: string;
}

export interface TokenState {
  name: string;
  symbol: string;
  totalSupply: string;
  currentPrice: string;
  maxSupply: string;
  priceLevels: PriceLevel[];
  currentName: string;
  marketType: number;
  bondingCurve: string;
  convictionNFT: string;
  CONVICTION_THRESHOLD: string;
  MIN_ORDER_SIZE: string;
  TOTAL_FEE_BPS: number;
  MAX_TOTAL_SUPPLY: string;
  poolAddress: string;
}

// Simple pool ABI for just getting price
const PoolABI = [
  {
    "inputs": [],
    "name": "slot0",
    "outputs": [
      { "internalType": "uint160", "name": "sqrtPriceX96", "type": "uint160" },
      { "internalType": "int24", "name": "tick", "type": "int24" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export async function getTokenState(tokenAddress: string): Promise<TokenState> {
  console.log('Getting state for token:', tokenAddress);
  
  try {
    // Get token data
    const [name, symbol, totalSupply, currentPrice, maxSupply, marketType, bondingCurve, convictionNFT, 
           convictionThreshold, minOrderSize, totalFeeBps, poolAddress] = await publicClient.multicall({
      contracts: [
        {
          address: tokenAddress as `0x${string}`,
          abi: higherrrrrrrAbi,
          functionName: 'name'
        },
        {
          address: tokenAddress as `0x${string}`,
          abi: higherrrrrrrAbi,
          functionName: 'symbol'
        },
        {
          address: tokenAddress as `0x${string}`,
          abi: higherrrrrrrAbi,
          functionName: 'totalSupply'
        },
        {
          address: tokenAddress as `0x${string}`,
          abi: higherrrrrrrAbi,
          functionName: 'getCurrentPrice'
        },
        {
          address: tokenAddress as `0x${string}`,
          abi: higherrrrrrrAbi,
          functionName: 'MAX_TOTAL_SUPPLY'
        },
        {
          address: tokenAddress as `0x${string}`,
          abi: higherrrrrrrAbi,
          functionName: 'marketType'
        },
        {
          address: tokenAddress as `0x${string}`,
          abi: higherrrrrrrAbi,
          functionName: 'bondingCurve'
        },
        {
          address: tokenAddress as `0x${string}`,
          abi: higherrrrrrrAbi,
          functionName: 'convictionNFT'
        },
        {
          address: tokenAddress as `0x${string}`,
          abi: higherrrrrrrAbi,
          functionName: 'CONVICTION_THRESHOLD'
        },
        {
          address: tokenAddress as `0x${string}`,
          abi: higherrrrrrrAbi,
          functionName: 'MIN_ORDER_SIZE'
        },
        {
          address: tokenAddress as `0x${string}`,
          abi: higherrrrrrrAbi,
          functionName: 'TOTAL_FEE_BPS'
        },
        {
          address: tokenAddress as `0x${string}`,
          abi: higherrrrrrrAbi,
          functionName: 'poolAddress'
        }
      ]
    });

    // Get price levels
    const priceLevels: PriceLevel[] = [];
    let levelIndex = 0;
    while (levelIndex < 20) {
      try {
        const level = await publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: higherrrrrrrAbi,
          functionName: 'priceLevels',
          args: [BigInt(levelIndex)]
        });
        if (!level || !level[1]) break;
        priceLevels.push({
          price: formatEther(level[0]),
          name: level[1]
        });
        levelIndex++;
      } catch {
        break;
      }
    }

    return {
      name: name.result?.toString() || '',
      symbol: symbol.result?.toString() || '',
      totalSupply: formatEther(totalSupply.result || BigInt(0)),
      currentPrice: formatEther(currentPrice.result || BigInt(0)),
      maxSupply: formatEther(maxSupply.result || BigInt(0)),
      marketType: Number(marketType.result || 0),
      bondingCurve: bondingCurve.result?.toString() || '',
      convictionNFT: convictionNFT.result?.toString() || '',
      CONVICTION_THRESHOLD: formatEther(convictionThreshold.result || BigInt(0)),
      MIN_ORDER_SIZE: formatEther(minOrderSize.result || BigInt(0)),
      TOTAL_FEE_BPS: Number(totalFeeBps.result || 0),
      poolAddress: poolAddress.result?.toString() || '',
      priceLevels,
      currentName: name.result?.toString() || '',
      MAX_TOTAL_SUPPLY: formatEther(maxSupply.result || BigInt(0))
    };
  } catch (error) {
    console.error('Error getting token state:', error);
    throw error;
  }
}

export async function getTokenStates(tokenAddresses: string[]): Promise<{ [key: string]: TokenState }> {
  const states: { [key: string]: TokenState } = {};
  for (const address of tokenAddresses) {
    try {
      states[address] = await getTokenState(address);
    } catch (error) {
      console.error(`Error getting state for token ${address}:`, error);
    }
  }
  return states;
}

export function getProgressToNextLevel(state: TokenState): number {
  if (state.marketType === 0) { // BONDING_CURVE
    const totalSupply = parseFloat(state.totalSupply);
    const maxBondingSupply = 800_000_000; // 800M tokens
    return (totalSupply / maxBondingSupply) * 100;
  }
  return 0;
}

export async function getUniswapQuote(
  tokenAddress: string,
  poolAddress: string,
  tokenAmount: bigint,
  isBuy: boolean
): Promise<bigint> {
  try {
    console.log('Getting quote for amount:', tokenAmount.toString());
    
    // Get current price from pool
    const slot0 = await publicClient.readContract({
      address: poolAddress as `0x${string}`,
      abi: PoolABI,
      functionName: 'slot0'
    });

    const sqrtPriceX96 = BigInt(slot0[0].toString());
    console.log('sqrtPriceX96:', sqrtPriceX96.toString());

    // Calculate price with more precision
    const Q96 = BigInt(2) ** BigInt(96);
    const priceX96 = (sqrtPriceX96 * sqrtPriceX96) / Q96;
    console.log('priceX96:', priceX96.toString());

    // Add 18 decimals of precision for the calculation
    const PRECISION = BigInt(10) ** BigInt(18);
    
    if (isBuy) {
      // For buying: amount * price
      const quote = (tokenAmount * priceX96 * PRECISION) / (Q96 * PRECISION);
      console.log('Buy quote:', quote.toString());
      return quote;
    } else {
      // For selling: amount / price
      const quote = (tokenAmount * Q96 * PRECISION) / (priceX96 * PRECISION);
      console.log('Sell quote:', quote.toString());
      return quote;
    }

  } catch (error) {
    console.error('Pool quote error:', error);
    throw error;
  }
}

// Rest of the file stays the same... 