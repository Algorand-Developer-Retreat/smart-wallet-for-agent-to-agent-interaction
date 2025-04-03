import DotGrid from '@/components/dot-grid'
import HomeSection from '@/components/installAgentSection'

export default function Home() {
  return (
    <div className="bg-gradient-to-br from-black to-akita-600/20 h-full overflow-hidden flex flex-col items-center relative">
      <header className="z-50">
        <h1 className="text-2xl sm:text-2xl lg:[font-size:10rem] md:[line-height:1] font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-akita-400 to-akita-600 uppercase">
          Smart Wallet
        </h1>
      </header>

      <div className="w-full flex items-center justify-center">
        <DotGrid />
      </div>

      <HomeSection />
    </div>
  )
}
