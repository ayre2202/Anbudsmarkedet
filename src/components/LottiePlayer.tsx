'use client'

import React, { useState, useEffect, useRef } from 'react'
import Lottie, { LottieRefCurrentProps } from 'lottie-react'

interface LottiePlayerProps {
  src: string
  className?: string
  style?: React.CSSProperties
  pauseWhenNotVisible?: boolean // Kontrollerer visibility detection
  speed?: number // Kontrollerer animasjonshastighet (default: 1)
}

export default function LottiePlayer({ 
  src, 
  className, 
  style,
  pauseWhenNotVisible = true,
  speed = 1 // Default hastighet
}: LottiePlayerProps) {
  const [animationData, setAnimationData] = useState<any>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isPageVisible, setIsPageVisible] = useState(true)
  const lottieRef = useRef<LottieRefCurrentProps>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Fetch animation data med timeout og cleanup
  useEffect(() => {
    if (!src) return

    const abortController = new AbortController()
    const timeoutId = setTimeout(() => {
      abortController.abort()
    }, 5000) // Redusert til 5s

    fetch(src, { 
      signal: abortController.signal,
      cache: 'force-cache'
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (mountedRef.current) {
          setAnimationData(data)
        }
      })
      .catch((error) => {
        if (error.name !== 'AbortError' && mountedRef.current) {
          console.warn('Lottie load failed:', error)
        }
      })
      .finally(() => {
        clearTimeout(timeoutId)
      })

    return () => {
      clearTimeout(timeoutId)
      abortController.abort()
    }
  }, [src])

  // Intersection Observer - detect when animation enters/leaves viewport
  useEffect(() => {
    if (!pauseWhenNotVisible || !containerRef.current) {
      setIsVisible(true)
      return
    }

    let observer: IntersectionObserver | null = null

    try {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (mountedRef.current) {
            setIsVisible(entry.isIntersecting)
          }
        },
        { threshold: 0.1 }
      )

      if (containerRef.current) {
        observer.observe(containerRef.current)
      }
    } catch (error) {
      setIsVisible(true)
    }

    return () => {
      if (observer) {
        observer.disconnect()
      }
    }
  }, [pauseWhenNotVisible])

  // Page Visibility API - detect tab changes
  useEffect(() => {
    if (!pauseWhenNotVisible) {
      setIsPageVisible(true)
      return
    }

    const handleVisibilityChange = () => {
      if (mountedRef.current) {
        setIsPageVisible(!document.hidden)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [pauseWhenNotVisible])

  // Control animation playback based on visibility and speed
  useEffect(() => {
    if (!lottieRef.current || !mountedRef.current) return

    const shouldPlay = pauseWhenNotVisible ? (isVisible && isPageVisible) : true

    try {
      if (shouldPlay) {
        lottieRef.current.play()
        lottieRef.current.setSpeed(Math.max(0.1, Math.min(2, speed))) // Clamp speed
      } else {
        lottieRef.current.pause()
      }
    } catch (error) {
      // Ignore animation control errors
    }
  }, [isVisible, isPageVisible, pauseWhenNotVisible, speed])

  // Smooth restart function - kun restart hvis animasjonen skal kjøre
  const handleComplete = () => {
    if (!lottieRef.current || !mountedRef.current) return
    
    const shouldPlay = pauseWhenNotVisible ? (isVisible && isPageVisible) : true
    
    if (shouldPlay) {
      try {
        // Dette gir smooth overgang uten hakking
        setTimeout(() => {
          if (lottieRef.current && mountedRef.current) {
            lottieRef.current.goToAndPlay(0, true)
          }
        }, 50)
      } catch (error) {
        // Ignore restart errors
      }
    }
  }

  if (!animationData) {
    return <div ref={containerRef} className={className} style={style} />
  }

  const shouldAutoplay = pauseWhenNotVisible ? (isVisible && isPageVisible) : true

  return (
    <div ref={containerRef} className={className} style={style}>
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={false} // Alltid false for å bruke manual restart
        autoplay={shouldAutoplay}
        onComplete={handleComplete} // Beholder den originale smooth restart-logikken
        rendererSettings={{
          preserveAspectRatio: 'xMidYMid slice',
        }}
      />
    </div>
  )
}