"use client";

import {ReactNode, useMemo} from "react";
import {WalletAdapterNetwork} from "@solana/wallet-adapter-base";
import {clusterApiUrl} from "@solana/web3.js";
import {PhantomWalletAdapter, SolflareWalletAdapter} from "@solana/wallet-adapter-wallets";
import {ConnectionProvider, WalletProvider} from "@solana/wallet-adapter-react";
import {WalletModalProvider, WalletMultiButton} from "@solana/wallet-adapter-react-ui";

const AppWalletProvider = ({children}: {children: ReactNode}) => {
    const network = WalletAdapterNetwork.Devnet;
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    const wallets = useMemo(() => [
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter(),
    ],
        [network]);
    return(
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect={true}>
                <WalletModalProvider>
                    <header className="bg-white shadow-md sticky top-0">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex justify-between items-center h-16">
                                {/* Logo (text) */}
                                <div className="text-xl font-bold text-gray-800">
                                    Twitter
                                </div>

                                {/* Wallet button */}
                                <WalletMultiButton
                                    className="!bg-indigo-600 hover:!bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg transition"/>
                            </div>
                        </div>
                    </header>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    )
}

export default AppWalletProvider;
