interface IpponIdWordmarkProps {
  // 'dark' = dark text for light backgrounds (Header, LogoLink)
  // 'light' = light text for dark backgrounds (Hero Zone, navy sections)
  variant?: 'dark' | 'light'
  className?: string
}

export default function IpponIdWordmark({ variant = 'dark', className = '' }: IpponIdWordmarkProps) {
  const ipponColor = variant === 'light' ? 'text-white' : 'text-primary'
  const idColor = variant === 'light' ? 'text-[#D4A017]' : 'text-tertiary-container'

  return (
    <span className={`font-montserrat font-black ${className}`}>
      <span className={ipponColor}>Ippon</span>
      <span className={idColor}>Id</span>
    </span>
  )
}
