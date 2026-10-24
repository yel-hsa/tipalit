import logo from '../assets/tipalit-logo.png'

type WordmarkProps = { size?: 'sm' | 'lg' }

// Single swap point for the TIPalit brand mark.
export default function Wordmark({ size = 'sm' }: WordmarkProps) {
  const large = size === 'lg'

  return (
    <div className={large ? 'flex flex-col items-center gap-lg' : 'flex items-center gap-md'}>
      <span
        className={`${large ? 'size-20 rounded-corner-lg' : 'size-9 rounded-corner-md'} block shrink-0 overflow-hidden`}
      >
        {/* The source PNG has a white margin around the tile; scale crops it away. */}
        <img src={logo} alt="" className="size-full object-cover scale-125" />
      </span>
      <span className={`${large ? 'text-title' : 'text-heading font-semibold'} text-text-primary`}>
        TIPalit
      </span>
    </div>
  )
}
