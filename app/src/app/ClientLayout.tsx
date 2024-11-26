"use client";

import { Button } from "@/components/Button";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { EthPriceProvider } from "@/components/EthPriceProvider";
import { TypeAndDelete } from "@/components/TypeAndDelete";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  CapsuleEvmProvider,
  coinbaseWallet,
  metaMaskWallet,
  walletConnectWallet,
} from "@usecapsule/evm-wallet-connectors";
import Link from "next/link";
import { PropsWithChildren, useEffect } from "react";
import Cookies from "js-cookie";

import { base } from "wagmi/chains";

const queryClient = new QueryClient();

export function ClientLayout({ children }: PropsWithChildren) {
  useEffect(() => {
    // Get token from cookie and set in localStorage
    const token = Cookies.get('auth_token');
    if (token) {
      localStorage.setItem('auth_token', token);
    }
  }, []);

  return (
    <CapsuleEvmProvider
      config={{
        projectId: "f6bd6e2911b56f5ac3bc8b2d0e2d7ad5",
        appName: "Higherrrrrrr",
        chains: [base],
        wallets: [metaMaskWallet, coinbaseWallet, walletConnectWallet],
      }}
    >
      <QueryClientProvider client={queryClient}>
        <EthPriceProvider>
          <div className="bg-black min-h-screen w-full text-white  flex flex-col pb-12">
            <Header />
            {children}
          </div>
        </EthPriceProvider>
      </QueryClientProvider>
    </CapsuleEvmProvider>
  );
}

function Header() {
  return (
    <div className="flex flex-col md:flex-row md:justify-between p-6 md:items-center gap-4">
      <Link href="/" className="text-xl font-bold">
        highe
        <span className="text-green-600">
          <TypeAndDelete words={["rrrrrrrrrrrrrrr"]} />
        </span>
      </Link>

      <div className="flex gap-x-4 flex-col sm:flex-row gap-2 items-stretch">
        <Link href="/new-token">
          <Button>+ New Coin</Button>
        </Link>

        <div>
          <ConnectWalletButton />
        </div>
      </div>
    </div>
  );
}
