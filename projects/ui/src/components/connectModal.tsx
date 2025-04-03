'use client'

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/utils/cn";
import { WalletIcon } from "@heroicons/react/20/solid";
import { useWallet } from "@txnlab/use-wallet-react"
import Image from "next/image";

export function ConnectModal() {
    const wallet = useWallet();

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button className="z-50 bg-black/10 dark:bg-black dark:text-white">
                    <WalletIcon className="h-[1.2rem] w-[1.2rem] transition-all" />
                    <span>Connect Wallet</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Connect</DialogTitle>
                    <DialogDescription>
                        Connect your wallet to interact
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {
                        wallet.wallets.map((wallet) => (
                            <DialogClose key={wallet.id} asChild>
                                <button
                                    type='button'
                                    className={cn(
                                        "flex w-full justify-start items-center gap-6",
                                        "border-2 border-transparent hover:border-white/20 hover:bg-black-highlight-left p-4 rounded-lg",
                                        "transition ease",
                                    )}
                                    onClick={() => wallet.connect()}
                                >
                                    <Image
                                        unoptimized
                                        width={40}
                                        height={40}
                                        sizes="200 200"
                                        src={wallet.metadata.icon}
                                        alt={wallet.metadata.name}
                                        className='rounded-lg'
                                    />
                                    <span>Connect with {wallet.metadata.name}</span>
                                </button>
                            </DialogClose>
                        ))
                    }
                </div>
            </DialogContent>
        </Dialog>
    )
}