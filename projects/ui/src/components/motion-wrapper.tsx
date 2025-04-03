'use client'
import { LazyMotion, AnimatePresence, domMax } from 'framer-motion'

export default function MotionWrapper({ children }: { children: React.ReactNode }) {
    return (
        <LazyMotion features={domMax}>
            <AnimatePresence>
                {children}
            </AnimatePresence>
        </LazyMotion>
    )
}