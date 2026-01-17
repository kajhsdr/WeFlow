import React, { memo, useEffect, useState, useRef } from 'react'

interface AnimatedStreamingTextProps {
    text: string
    className?: string
    loading?: boolean
}

export const AnimatedStreamingText = memo(({ text, className, loading }: AnimatedStreamingTextProps) => {
    const [displayedSegments, setDisplayedSegments] = useState<string[]>([])
    const prevTextRef = useRef('')

    useEffect(() => {
        const currentText = (text || '').trim()
        const prevText = prevTextRef.current

        if (currentText === prevText) return
        if (!currentText.startsWith(prevText) && prevText !== '') {
            // 如果不是追加而是全新的文本（比如重新识别），则重置
            setDisplayedSegments([currentText])
            prevTextRef.current = currentText
            return
        }

        const newPart = currentText.slice(prevText.length)
        if (newPart) {
            // 将新部分作为单独的段加入，以触发动画
            setDisplayedSegments(prev => [...prev, newPart])
        }
        prevTextRef.current = currentText
    }, [text])

    // 处理 loading 状态的显示
    if (loading && !text) {
        return <span className={className}>转写中<span className="dot-flashing">...</span></span>
    }

    return (
        <span className={className}>
            {displayedSegments.map((segment, index) => (
                <span key={index} className="fade-in-text">
                    {segment}
                </span>
            ))}
            <style>{`
        .fade-in-text {
          animation: fadeIn 0.5s ease-out forwards;
          opacity: 0;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(2px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dot-flashing {
           animation: blink 1s infinite;
        }
        @keyframes blink { 50% { opacity: 0; } }
      `}</style>
        </span>
    )
})

AnimatedStreamingText.displayName = 'AnimatedStreamingText'
