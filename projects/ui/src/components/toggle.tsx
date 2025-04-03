'use client'

import { AnimatePresence, m } from "framer-motion";
import { useState } from "react"

type State = 'passkey' | 'full' | 'fallback'

const states: { name: State, label: string }[] = [
    { name: 'passkey', label: 'Passkey' },
    { name: 'full', label: 'Full Delegation' },
    { name: 'fallback', label: 'Graceful Fallback' }
]

export default function Toggle() {
    const [state, setState] = useState<State>('passkey');

    return (
        <>
            <div className="p-1 bg-zinc-900 rounded-xl shadow-2xl shadow-black">
                <div className="flex items-stretch gap-2">
                    {states.map(({ name, label }) => (
                        <button
                            key={name}
                            className={`relative inline-flex items-center px-4 py-2 rounded-lg ${state === name ? 'text-akita-600' : 'text-zinc-400 hover:bg-akita-900'}`}
                            onClick={() => setState(name)}
                        >
                            <span className="z-10 transition duration-[0.175]">{label}</span>
                            <AnimatePresence>
                                {state === name && (
                                    <m.div
                                        key="indicator"
                                        layoutId="indicator"
                                        initial={false}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.175 }}
                                        className="absolute inset-0 border-2 border-akita-600 rounded-lg"
                                    />
                                )}
                            </AnimatePresence>
                        </button>
                    ))}
                </div>
            </div>

            {
                state === 'passkey' && (
                    <>
                        <div className="h-96 w-full bg-zinc-900 rounded-xl p-1 shadow-2xl shadow-black">
                            <div className="w-full h-full border-2 border-akita-600 rounded-lg">

                            </div>
                        </div>
                        <div className="h-52 w-full bg-zinc-900 rounded-xl p-1 shadow-2xl shadow-black">
                            <div className="w-full h-full border-2 border-akita-600 rounded-lg">

                            </div>
                        </div>
                    </>
                )
            }

            {
                state === 'full' && (
                    <>
                        <div className="h-96 w-full bg-zinc-900 rounded-xl p-1 shadow-2xl shadow-black">
                            <div className="w-full h-full border-2 border-akita-600 rounded-lg">

                            </div>
                        </div>
                        <div className="h-52 w-full bg-zinc-900 rounded-xl p-1 shadow-2xl shadow-black">
                            <div className="w-full h-full border-2 border-akita-600 rounded-lg">

                            </div>
                        </div>
                    </>
                )
            }

            {
                state === 'fallback' && (
                    <>
                        <div className="h-96 w-full bg-zinc-900 rounded-xl p-1 shadow-2xl shadow-black">
                            <div className="w-full h-full border-2 border-akita-600 rounded-lg">

                            </div>
                        </div>
                        <div className="h-52 w-full bg-zinc-900 rounded-xl p-1 shadow-2xl shadow-black">
                            <div className="w-full h-full border-2 border-akita-600 rounded-lg">

                            </div>
                        </div>
                    </>
                )
            }
        </>
    )
}