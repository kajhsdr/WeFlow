import { useEffect, useState, type CSSProperties } from 'react'
import './AnnualReportWindow.scss'
import './DualReportWindow.scss'

interface DualReportMessage {
  content: string
  isSentByMe: boolean
  createTime: number
  createTimeStr: string
}

interface DualReportData {
  year: number
  selfName: string
  friendUsername: string
  friendName: string
  firstChat: {
    createTime: number
    createTimeStr: string
    content: string
    isSentByMe: boolean
    senderUsername?: string
  } | null
  firstChatMessages?: DualReportMessage[]
  yearFirstChat?: {
    createTime: number
    createTimeStr: string
    content: string
    isSentByMe: boolean
    friendName: string
    firstThreeMessages: DualReportMessage[]
  } | null
  stats: {
    totalMessages: number
    totalWords: number
    imageCount: number
    voiceCount: number
    emojiCount: number
    myTopEmojiMd5?: string
    friendTopEmojiMd5?: string
    myTopEmojiUrl?: string
    friendTopEmojiUrl?: string
  }
  topPhrases: Array<{ phrase: string; count: number }>
}

const WordCloud = ({ words }: { words: { phrase: string; count: number }[] }) => {
  if (!words || words.length === 0) {
    return <div className="word-cloud-empty">暂无高频语句</div>
  }
  const sortedWords = [...words].sort((a, b) => b.count - a.count)
  const maxCount = sortedWords.length > 0 ? sortedWords[0].count : 1
  const topWords = sortedWords.slice(0, 32)
  const baseSize = 520

  const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000
    return x - Math.floor(x)
  }

  const placedItems: { x: number; y: number; w: number; h: number }[] = []

  const canPlace = (x: number, y: number, w: number, h: number): boolean => {
    const halfW = w / 2
    const halfH = h / 2
    const dx = x - 50
    const dy = y - 50
    const dist = Math.sqrt(dx * dx + dy * dy)
    const maxR = 49 - Math.max(halfW, halfH)
    if (dist > maxR) return false

    const pad = 1.8
    for (const p of placedItems) {
      if ((x - halfW - pad) < (p.x + p.w / 2) &&
        (x + halfW + pad) > (p.x - p.w / 2) &&
        (y - halfH - pad) < (p.y + p.h / 2) &&
        (y + halfH + pad) > (p.y - p.h / 2)) {
        return false
      }
    }
    return true
  }

  const wordItems = topWords.map((item, i) => {
    const ratio = item.count / maxCount
    const fontSize = Math.round(12 + Math.pow(ratio, 0.65) * 20)
    const opacity = Math.min(1, Math.max(0.35, 0.35 + ratio * 0.65))
    const delay = (i * 0.04).toFixed(2)

    const charCount = Math.max(1, item.phrase.length)
    const hasCjk = /[\u4e00-\u9fff]/.test(item.phrase)
    const hasLatin = /[A-Za-z0-9]/.test(item.phrase)
    const widthFactor = hasCjk && hasLatin ? 0.85 : hasCjk ? 0.98 : 0.6
    const widthPx = fontSize * (charCount * widthFactor)
    const heightPx = fontSize * 1.1
    const widthPct = (widthPx / baseSize) * 100
    const heightPct = (heightPx / baseSize) * 100

    let x = 50, y = 50
    let placedOk = false
    const tries = i === 0 ? 1 : 420

    for (let t = 0; t < tries; t++) {
      if (i === 0) {
        x = 50
        y = 50
      } else {
        const idx = i + t * 0.28
        const radius = Math.sqrt(idx) * 7.6 + (seededRandom(i * 1000 + t) * 1.2 - 0.6)
        const angle = idx * 2.399963 + seededRandom(i * 2000 + t) * 0.35
        x = 50 + radius * Math.cos(angle)
        y = 50 + radius * Math.sin(angle)
      }
      if (canPlace(x, y, widthPct, heightPct)) {
        placedOk = true
        break
      }
    }

    if (!placedOk) return null
    placedItems.push({ x, y, w: widthPct, h: heightPct })

    return (
      <span
        key={i}
        className="word-tag"
        style={{
          '--final-opacity': opacity,
          left: `${x.toFixed(2)}%`,
          top: `${y.toFixed(2)}%`,
          fontSize: `${fontSize}px`,
          animationDelay: `${delay}s`,
        } as CSSProperties}
        title={`${item.phrase} (出现 ${item.count} 次)`}
      >
        {item.phrase}
      </span>
    )
  }).filter(Boolean)

  return (
    <div className="word-cloud-wrapper">
      <div className="word-cloud-inner">
        {wordItems}
      </div>
    </div>
  )
}

function DualReportWindow() {
  const [reportData, setReportData] = useState<DualReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingStage, setLoadingStage] = useState('准备中')
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [myEmojiUrl, setMyEmojiUrl] = useState<string | null>(null)
  const [friendEmojiUrl, setFriendEmojiUrl] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '')
    const username = params.get('username')
    const yearParam = params.get('year')
    const parsedYear = yearParam ? parseInt(yearParam, 10) : 0
    const year = Number.isNaN(parsedYear) ? 0 : parsedYear
    if (!username) {
      setError('缺少好友信息')
      setIsLoading(false)
      return
    }
    generateReport(username, year)
  }, [])

  const generateReport = async (friendUsername: string, year: number) => {
    setIsLoading(true)
    setError(null)
    setLoadingProgress(0)

    const removeProgressListener = window.electronAPI.dualReport.onProgress?.((payload: { status: string; progress: number }) => {
      setLoadingProgress(payload.progress)
      setLoadingStage(payload.status)
    })

    try {
      const result = await window.electronAPI.dualReport.generateReport({ friendUsername, year })
      removeProgressListener?.()
      setLoadingProgress(100)
      setLoadingStage('完成')

      if (result.success && result.data) {
        setReportData(result.data)
        setIsLoading(false)
      } else {
        setError(result.error || '生成报告失败')
        setIsLoading(false)
      }
    } catch (e) {
      removeProgressListener?.()
      setError(String(e))
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const loadEmojis = async () => {
      if (!reportData) return
      const stats = reportData.stats
      if (stats.myTopEmojiUrl) {
        const res = await window.electronAPI.chat.downloadEmoji(stats.myTopEmojiUrl, stats.myTopEmojiMd5)
        if (res.success && res.localPath) {
          setMyEmojiUrl(res.localPath)
        }
      }
      if (stats.friendTopEmojiUrl) {
        const res = await window.electronAPI.chat.downloadEmoji(stats.friendTopEmojiUrl, stats.friendTopEmojiMd5)
        if (res.success && res.localPath) {
          setFriendEmojiUrl(res.localPath)
        }
      }
    }
    void loadEmojis()
  }, [reportData])

  if (isLoading) {
    return (
      <div className="annual-report-window loading">
        <div className="loading-ring">
          <svg viewBox="0 0 100 100">
            <circle className="ring-bg" cx="50" cy="50" r="42" />
            <circle
              className="ring-progress"
              cx="50" cy="50" r="42"
              style={{ strokeDashoffset: 264 - (264 * loadingProgress / 100) }}
            />
          </svg>
          <span className="ring-text">{loadingProgress}%</span>
        </div>
        <p className="loading-stage">{loadingStage}</p>
        <p className="loading-hint">进行中</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="annual-report-window error">
        <p>生成报告失败: {error}</p>
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="annual-report-window error">
        <p>暂无数据</p>
      </div>
    )
  }

  const yearTitle = reportData.year === 0 ? '全部时间' : `${reportData.year}年`
  const firstChat = reportData.firstChat
  const firstChatMessages = (reportData.firstChatMessages && reportData.firstChatMessages.length > 0)
    ? reportData.firstChatMessages.slice(0, 3)
    : firstChat
      ? [{
        content: firstChat.content,
        isSentByMe: firstChat.isSentByMe,
        createTime: firstChat.createTime,
        createTimeStr: firstChat.createTimeStr
      }]
      : []
  const daysSince = firstChat
    ? Math.max(0, Math.floor((Date.now() - firstChat.createTime) / 86400000))
    : null
  const yearFirstChat = reportData.yearFirstChat
  const stats = reportData.stats
  const statItems = [
    { label: '总消息数', value: stats.totalMessages },
    { label: '总字数', value: stats.totalWords },
    { label: '图片', value: stats.imageCount },
    { label: '语音', value: stats.voiceCount },
    { label: '表情', value: stats.emojiCount },
  ]

  const decodeEntities = (text: string) => (
    text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
  )

  const stripCdata = (text: string) => text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')

  const extractXmlText = (content: string) => {
    const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/i)
    if (titleMatch?.[1]) return titleMatch[1]
    const descMatch = content.match(/<des>([\s\S]*?)<\/des>/i)
    if (descMatch?.[1]) return descMatch[1]
    const summaryMatch = content.match(/<summary>([\s\S]*?)<\/summary>/i)
    if (summaryMatch?.[1]) return summaryMatch[1]
    const contentMatch = content.match(/<content>([\s\S]*?)<\/content>/i)
    if (contentMatch?.[1]) return contentMatch[1]
    return ''
  }

  const formatMessageContent = (content?: string) => {
    const raw = String(content || '').trim()
    if (!raw) return '（空）'
    const hasXmlTag = /<\s*[a-zA-Z]+[^>]*>/.test(raw)
    const looksLikeXml = /<\?xml|<msg\b|<appmsg\b|<sysmsg\b|<appattach\b|<emoji\b|<img\b|<voip\b/i.test(raw)
      || hasXmlTag
    if (!looksLikeXml) return raw
    const extracted = extractXmlText(raw)
    if (!extracted) return '（XML消息）'
    return decodeEntities(stripCdata(extracted).trim()) || '（XML消息）'
  }
  const formatFullDate = (timestamp: number) => {
    const d = new Date(timestamp)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hour = String(d.getHours()).padStart(2, '0')
    const minute = String(d.getMinutes()).padStart(2, '0')
    return `${year}/${month}/${day} ${hour}:${minute}`
  }

  return (
    <div className="annual-report-window dual-report-window">
      <div className="drag-region" />

      <div className="bg-decoration">
        <div className="deco-circle c1" />
        <div className="deco-circle c2" />
        <div className="deco-circle c3" />
        <div className="deco-circle c4" />
        <div className="deco-circle c5" />
      </div>

      <div className="report-scroll-view">
        <div className="report-container">
          <section className="section">
            <div className="label-text">WEFLOW · DUAL REPORT</div>
            <h1 className="hero-title dual-cover-title">{yearTitle}<br />双人聊天报告</h1>
            <hr className="divider" />
            <div className="dual-names">
              <span>{reportData.selfName}</span>
              <span className="amp">&amp;</span>
              <span>{reportData.friendName}</span>
            </div>
            <p className="hero-desc">每一次对话都值得被珍藏</p>
          </section>

          <section className="section">
            <div className="label-text">首次聊天</div>
            <h2 className="hero-title">故事的开始</h2>
            {firstChat ? (
              <>
                <div className="dual-info-grid">
                  <div className="dual-info-card">
                    <div className="info-label">第一次聊天时间</div>
                    <div className="info-value">{formatFullDate(firstChat.createTime)}</div>
                  </div>
                  <div className="dual-info-card">
                    <div className="info-label">距今天数</div>
                    <div className="info-value">{daysSince} 天</div>
                  </div>
                </div>
                {firstChatMessages.length > 0 ? (
                  <div className="dual-message-list">
                    {firstChatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`dual-message ${msg.isSentByMe ? 'sent' : 'received'}`}
                      >
                        <div className="message-meta">
                          {msg.isSentByMe ? reportData.selfName : reportData.friendName} · {formatFullDate(msg.createTime)}
                        </div>
                        <div className="message-content">{formatMessageContent(msg.content)}</div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="hero-desc">暂无首条消息</p>
            )}
          </section>

          {yearFirstChat ? (
            <section className="section">
              <div className="label-text">第一段对话</div>
              <h2 className="hero-title">
                {reportData.year === 0 ? '你们的第一段对话' : `${reportData.year}年的第一段对话`}
              </h2>
              <div className="dual-info-grid">
                <div className="dual-info-card">
                  <div className="info-label">第一段对话时间</div>
                  <div className="info-value">{formatFullDate(yearFirstChat.createTime)}</div>
                </div>
                <div className="dual-info-card">
                  <div className="info-label">发起者</div>
                  <div className="info-value">{yearFirstChat.isSentByMe ? reportData.selfName : reportData.friendName}</div>
                </div>
              </div>
              <div className="dual-message-list">
                {yearFirstChat.firstThreeMessages.map((msg, idx) => (
                  <div key={idx} className={`dual-message ${msg.isSentByMe ? 'sent' : 'received'}`}>
                    <div className="message-meta">
                      {msg.isSentByMe ? reportData.selfName : reportData.friendName} · {formatFullDate(msg.createTime)}
                    </div>
                    <div className="message-content">{formatMessageContent(msg.content)}</div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="section">
            <div className="label-text">常用语</div>
            <h2 className="hero-title">{yearTitle}常用语</h2>
            <WordCloud words={reportData.topPhrases} />
          </section>

          <section className="section">
            <div className="label-text">年度统计</div>
            <h2 className="hero-title">{yearTitle}数据概览</h2>
            <div className="dual-stat-grid">
              {statItems.map((item) => {
                const valueText = item.value.toLocaleString()
                const isLong = valueText.length > 7
                return (
                  <div key={item.label} className={`dual-stat-card ${isLong ? 'long' : ''}`}>
                    <div className="stat-num">{valueText}</div>
                    <div className="stat-unit">{item.label}</div>
                  </div>
                )
              })}
            </div>

            <div className="emoji-row">
              <div className="emoji-card">
                <div className="emoji-title">我常用的表情</div>
                {myEmojiUrl ? (
                  <img src={myEmojiUrl} alt="my-emoji" />
                ) : (
                  <div className="emoji-placeholder">{stats.myTopEmojiMd5 || '暂无'}</div>
                )}
              </div>
              <div className="emoji-card">
                <div className="emoji-title">{reportData.friendName}常用的表情</div>
                {friendEmojiUrl ? (
                  <img src={friendEmojiUrl} alt="friend-emoji" />
                ) : (
                  <div className="emoji-placeholder">{stats.friendTopEmojiMd5 || '暂无'}</div>
                )}
              </div>
            </div>
          </section>

          <section className="section">
            <div className="label-text">尾声</div>
            <h2 className="hero-title">谢谢你一直在</h2>
            <p className="hero-desc">愿我们继续把故事写下去</p>
          </section>
        </div>
      </div>
    </div>
  )
}

export default DualReportWindow
