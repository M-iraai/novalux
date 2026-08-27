import { useState, useRef, useEffect, memo } from 'react'

const LazyImage = memo(function LazyImage({ src, alt = '', className = '', fallback }) {
  const [loaded, setLoaded] = useState(false)
  const [inView, setInView] = useState(false)
  const [error, setError] = useState(false)
  const imgRef = useRef(null)

  useEffect(() => {
    const el = imgRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' } // Start loading 200px before visible
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  if (!src || error) {
    return (
      <div ref={imgRef} className={className}>
        {fallback || (
          <div className="w-full h-full bg-soft flex items-center justify-center text-muted">
            <span className="text-xl">📦</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div ref={imgRef} className={`${className} relative`}>
      {/* Placeholder shimmer */}
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 animate-pulse" />
      )}
      {inView && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  )
})

export default LazyImage
